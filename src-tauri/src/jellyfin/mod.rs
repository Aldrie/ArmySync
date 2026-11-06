mod client;
pub mod follow;
pub mod media;
mod proxy;
pub mod waveform;

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};
use std::time::Duration;

use reqwest::{Method, StatusCode, Url};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, State};

use crate::library::{app_data_dir, write_json_atomic};
use client::{
  call, is_supported_version, normalize_url, ok_json, request, session_from_auth, status_error,
  text, QuickConnectCode, ServerInfo, Session, Status, JSON_TIMEOUT, NOT_SIGNED_IN,
};

const FILE: &str = "jellyfin.json";
const EXPIRED: &str = "Jellyfin session expired. Sign in again.";

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Stored {
  device_id: String,
  session: Option<Session>,
}

impl Stored {
  fn apply_status(&mut self, code: u16, token: &str) -> Result<(), String> {
    match code {
      200..=299 => Ok(()),
      401 => {
        if self.session.as_ref().is_some_and(|s| s.token == token) {
          self.session = None;
        }
        Err(EXPIRED.into())
      }
      _ => Err(status_error(code)),
    }
  }
}

pub struct JellyfinState {
  http: reqwest::Client,
  dir: PathBuf,
  stored: Arc<Mutex<Stored>>,
  play_session: Mutex<Option<String>>,
  follow: Mutex<Option<(String, tokio::task::JoinHandle<()>)>>,
  proxy_port: u16,
  proxy_nonce: String,
}

fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
  mutex.lock().unwrap_or_else(PoisonError::into_inner)
}

fn save(dir: &Path, stored: &Stored) -> Result<(), String> {
  let value = serde_json::to_value(stored).map_err(|e| format!("Failed to serialize: {e}"))?;
  write_json_atomic(dir, FILE, &value)
}

impl JellyfinState {
  pub fn load(app: &AppHandle) -> Result<Self, String> {
    let mut state = Self::load_in(app_data_dir(app)?)?;
    state.proxy_port = proxy::start(app.clone(), state.proxy_nonce.clone())?;
    Ok(state)
  }

  fn load_in(dir: PathBuf) -> Result<Self, String> {
    let http = reqwest::Client::builder()
      .connect_timeout(Duration::from_secs(5))
      .build()
      .map_err(|e| format!("Failed to start HTTP client: {e}"))?;
    let existing = fs::read_to_string(dir.join(FILE))
      .ok()
      .and_then(|content| serde_json::from_str(&content).ok());
    let stored = match existing {
      Some(stored) => stored,
      None => {
        let fresh = Stored {
          device_id: uuid::Uuid::new_v4().simple().to_string(),
          session: None,
        };
        save(&dir, &fresh)?;
        fresh
      }
    };
    Ok(Self {
      http,
      dir,
      stored: Arc::new(Mutex::new(stored)),
      play_session: Mutex::new(None),
      follow: Mutex::new(None),
      proxy_port: 0,
      proxy_nonce: uuid::Uuid::new_v4().simple().to_string(),
    })
  }

  fn device_id(&self) -> String {
    lock(&self.stored).device_id.clone()
  }

  fn session(&self) -> Option<Session> {
    lock(&self.stored).session.clone()
  }

  fn user_id(&self) -> Result<String, String> {
    self
      .session()
      .map(|s| s.user_id)
      .ok_or(NOT_SIGNED_IN.into())
  }

  fn set_session(&self, session: Option<Session>) -> Result<(), String> {
    let mut stored = lock(&self.stored);
    stored.session = session;
    save(&self.dir, &stored)
  }

  async fn anon_json(
    &self,
    method: Method,
    url: &str,
    body: Option<&Value>,
  ) -> Result<Value, String> {
    ok_json(call(self, method, url, None, body, Some(JSON_TIMEOUT)).await?).await
  }

  async fn server_name(&self, url: &str) -> Result<String, String> {
    let info = self
      .anon_json(Method::GET, &format!("{url}/System/Info/Public"), None)
      .await?;
    text(&info, "ServerName")
  }

  fn sign_in(&self, url: &str, server_name: &str, auth: &Value) -> Result<Status, String> {
    let session = session_from_auth(url, server_name, auth)?;
    let status = Status::from(&session);
    self.set_session(Some(session))?;
    Ok(status)
  }
}

#[tauri::command]
pub fn jellyfin_status(state: State<'_, JellyfinState>) -> Option<Status> {
  lock(&state.stored).session.as_ref().map(Status::from)
}

#[tauri::command]
pub async fn jellyfin_probe(
  url: String,
  state: State<'_, JellyfinState>,
) -> Result<ServerInfo, String> {
  let url = normalize_url(&url)?;
  let info = state
    .anon_json(Method::GET, &format!("{url}/System/Info/Public"), None)
    .await?;
  let quick_connect = state
    .anon_json(Method::GET, &format!("{url}/QuickConnect/Enabled"), None)
    .await
    .is_ok_and(|v| v == true);
  let version = text(&info, "Version")?;
  Ok(ServerInfo {
    name: text(&info, "ServerName")?,
    supported: is_supported_version(&version),
    version,
    id: text(&info, "Id")?,
    quick_connect,
    url,
  })
}

#[tauri::command]
pub async fn jellyfin_login(
  url: String,
  username: String,
  password: String,
  state: State<'_, JellyfinState>,
) -> Result<Status, String> {
  let url = normalize_url(&url)?;
  let server_name = state.server_name(&url).await?;
  let body = json!({ "Username": username, "Pw": password });
  let res = call(
    &state,
    Method::POST,
    &format!("{url}/Users/AuthenticateByName"),
    None,
    Some(&body),
    Some(JSON_TIMEOUT),
  )
  .await?;
  if res.status() == StatusCode::UNAUTHORIZED {
    return Err("Wrong username or password".into());
  }
  state.sign_in(&url, &server_name, &ok_json(res).await?)
}

#[tauri::command]
pub async fn jellyfin_quick_connect_start(
  url: String,
  state: State<'_, JellyfinState>,
) -> Result<QuickConnectCode, String> {
  let url = normalize_url(&url)?;
  let body = state
    .anon_json(Method::POST, &format!("{url}/QuickConnect/Initiate"), None)
    .await?;
  Ok(QuickConnectCode {
    code: text(&body, "Code")?,
    secret: text(&body, "Secret")?,
  })
}

#[tauri::command]
pub async fn jellyfin_quick_connect_poll(
  url: String,
  secret: String,
  state: State<'_, JellyfinState>,
) -> Result<Option<Status>, String> {
  let url = normalize_url(&url)?;
  let connect = Url::parse_with_params(
    &format!("{url}/QuickConnect/Connect"),
    [("secret", &secret)],
  )
  .map_err(|e| e.to_string())?;
  let connected = state.anon_json(Method::GET, connect.as_str(), None).await?;
  if connected["Authenticated"] != true {
    return Ok(None);
  }
  let server_name = state.server_name(&url).await?;
  let body = json!({ "Secret": secret });
  let auth = state
    .anon_json(
      Method::POST,
      &format!("{url}/Users/AuthenticateWithQuickConnect"),
      Some(&body),
    )
    .await?;
  state.sign_in(&url, &server_name, &auth).map(Some)
}

#[tauri::command]
pub async fn jellyfin_logout(state: State<'_, JellyfinState>) -> Result<(), String> {
  let previous = state.session();
  let saved = state.set_session(None);
  if let Some(s) = previous {
    let logout = request(
      &state,
      Method::POST,
      &format!("{}/Sessions/Logout", s.url),
      Some(&s.token),
    )
    .timeout(JSON_TIMEOUT);
    tauri::async_runtime::spawn(async move {
      let _ = logout.send().await;
    });
  }
  saved
}

#[cfg(test)]
mod tests {
  use super::*;

  fn sample_session() -> Session {
    Session {
      url: "http://h:8096".into(),
      server_id: "srv".into(),
      server_name: "Bobina".into(),
      user_id: "u1".into(),
      user_name: "aldrie".into(),
      token: "tok".into(),
    }
  }

  #[test]
  fn signs_out_on_401() {
    let mut stored = Stored {
      device_id: "d".into(),
      session: Some(sample_session()),
    };
    assert!(stored.apply_status(401, "tok").is_err());
    assert!(stored.session.is_none());
    let mut ok = Stored {
      device_id: "d".into(),
      session: Some(sample_session()),
    };
    assert!(ok.apply_status(200, "tok").is_ok());
    assert!(ok.session.is_some());
  }

  #[test]
  fn a_stale_401_keeps_the_newer_session() {
    let mut stored = Stored {
      device_id: "d".into(),
      session: Some(sample_session()),
    };
    assert!(stored.apply_status(401, "old").is_err());
    assert!(stored.session.is_some());
  }

  #[test]
  fn reports_expiry_even_if_saving_fails() {
    let dir = std::env::temp_dir().join(format!("armysync-jf-{}", uuid::Uuid::new_v4().simple()));
    let mut state = JellyfinState::load_in(dir.clone()).unwrap();
    let _ = fs::remove_dir_all(&dir);
    state.dir = PathBuf::from("/dev/null/armysync");
    lock(&state.stored).session = Some(sample_session());
    assert_eq!(
      client::check_status(&state, "tok", 401).unwrap_err(),
      EXPIRED
    );
    assert!(state.session().is_none());
  }

  #[test]
  fn keeps_device_id_and_session_across_loads() {
    let dir = std::env::temp_dir().join(format!("armysync-jf-{}", uuid::Uuid::new_v4().simple()));
    let first = JellyfinState::load_in(dir.clone()).unwrap();
    first.set_session(Some(sample_session())).unwrap();
    let second = JellyfinState::load_in(dir.clone()).unwrap();
    let _ = fs::remove_dir_all(&dir);
    assert_eq!(first.device_id(), second.device_id());
    assert_eq!(first.device_id().len(), 32);
    assert!(lock(&second.stored).session.is_some());
  }
}
