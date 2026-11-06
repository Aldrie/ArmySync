use std::time::Duration;

use reqwest::header::AUTHORIZATION;
use reqwest::{Method, RequestBuilder, Response, Url};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::{lock, save, JellyfinState};

pub(crate) const JSON_TIMEOUT: Duration = Duration::from_secs(15);
pub(crate) const NOT_SIGNED_IN: &str = "Not signed in to Jellyfin";

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
  pub url: String,
  pub server_id: String,
  pub server_name: String,
  pub user_id: String,
  pub user_name: String,
  pub token: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
  pub url: String,
  pub server_id: String,
  pub server_name: String,
  pub user_name: String,
}

impl From<&Session> for Status {
  fn from(s: &Session) -> Self {
    Self {
      url: s.url.clone(),
      server_id: s.server_id.clone(),
      server_name: s.server_name.clone(),
      user_name: s.user_name.clone(),
    }
  }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerInfo {
  pub name: String,
  pub version: String,
  pub id: String,
  pub supported: bool,
  pub quick_connect: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickConnectCode {
  pub code: String,
  pub secret: String,
}

pub(crate) fn normalize_url(input: &str) -> Result<String, String> {
  let input = input.trim();
  if input.is_empty() {
    return Err("Enter the Jellyfin server address".into());
  }
  let with_scheme = if input.contains("://") {
    input.to_string()
  } else {
    format!("http://{input}")
  };
  let mut url =
    Url::parse(&with_scheme).map_err(|_| format!("Invalid server address '{input}'"))?;
  if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none() {
    return Err(format!("Invalid server address '{input}'"));
  }
  url.set_query(None);
  url.set_fragment(None);
  // keeps a reverse-proxy base path like /jellyfin while dropping the web client's /web/...
  let path = format!("{}/", url.path());
  let base = path.split("/web/").next().unwrap_or("").to_string();
  url.set_path(&base);
  Ok(url.as_str().trim_end_matches('/').to_string())
}

pub(crate) fn is_supported_version(version: &str) -> bool {
  let mut parts = version.split('.').map(str::parse::<u32>);
  match (parts.next(), parts.next()) {
    (Some(Ok(major)), Some(Ok(minor))) => (major, minor) >= (10, 10),
    _ => false,
  }
}

pub(crate) fn auth_header(device_id: &str, token: Option<&str>) -> String {
  let version = env!("CARGO_PKG_VERSION");
  let header = format!(
    r#"MediaBrowser Client="ArmySync", Device="Mac", DeviceId="{device_id}", Version="{version}""#
  );
  match token {
    Some(token) => format!(r#"{header}, Token="{token}""#),
    None => header,
  }
}

pub(crate) fn text(body: &Value, key: &str) -> Result<String, String> {
  body[key]
    .as_str()
    .map(str::to_string)
    .ok_or_else(|| format!("Unexpected Jellyfin response: missing {key}"))
}

pub(crate) fn session_from_auth(
  url: &str,
  server_name: &str,
  body: &Value,
) -> Result<Session, String> {
  Ok(Session {
    url: url.to_string(),
    server_id: text(body, "ServerId")?,
    server_name: server_name.to_string(),
    user_id: text(&body["User"], "Id")?,
    user_name: text(&body["User"], "Name")?,
    token: text(body, "AccessToken")?,
  })
}

pub(crate) fn status_error(code: u16) -> String {
  format!("Jellyfin returned HTTP {code}")
}

pub(crate) fn request(
  state: &JellyfinState,
  method: Method,
  url: &str,
  token: Option<&str>,
) -> RequestBuilder {
  state
    .http
    .request(method, url)
    .header(AUTHORIZATION, auth_header(&state.device_id(), token))
}

pub(crate) async fn call(
  state: &JellyfinState,
  method: Method,
  url: &str,
  token: Option<&str>,
  body: Option<&Value>,
  timeout: Option<Duration>,
) -> Result<Response, String> {
  let mut req = request(state, method, url, token);
  if let Some(body) = body {
    req = req.json(body);
  }
  if let Some(timeout) = timeout {
    req = req.timeout(timeout);
  }
  req
    .send()
    .await
    .map_err(|e| format!("Can't reach Jellyfin: {e}"))
}

pub(crate) async fn ok_json(res: Response) -> Result<Value, String> {
  if !res.status().is_success() {
    return Err(status_error(res.status().as_u16()));
  }
  res
    .json()
    .await
    .map_err(|e| format!("Unexpected Jellyfin response: {e}"))
}

pub(crate) fn check_status(state: &JellyfinState, token: &str, code: u16) -> Result<(), String> {
  let mut stored = lock(&state.stored);
  let result = stored.apply_status(code, token);
  if code == 401 {
    if let Err(e) = save(&state.dir, &stored) {
      eprintln!("[jellyfin] {e}");
    }
  }
  result
}

pub(crate) async fn send(
  state: &JellyfinState,
  method: Method,
  path: &str,
  body: Option<&Value>,
  timeout: Option<Duration>,
) -> Result<Response, String> {
  let session = state.session().ok_or(NOT_SIGNED_IN)?;
  let url = format!("{}{path}", session.url);
  let res = call(state, method, &url, Some(&session.token), body, timeout).await?;
  check_status(state, &session.token, res.status().as_u16())?;
  Ok(res)
}

pub(crate) async fn get_json(state: &JellyfinState, path: &str) -> Result<Value, String> {
  let res = send(state, Method::GET, path, None, Some(JSON_TIMEOUT)).await?;
  ok_json(res).await
}

pub(crate) async fn post_json(
  state: &JellyfinState,
  path: &str,
  body: &Value,
) -> Result<Value, String> {
  let res = send(state, Method::POST, path, Some(body), Some(JSON_TIMEOUT)).await?;
  ok_json(res).await
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde_json::json;

  #[test]
  fn normalizes_server_urls() {
    assert_eq!(
      normalize_url("homelab:8096").unwrap(),
      "http://homelab:8096"
    );
    assert_eq!(
      normalize_url(" http://homelab:8096/web/#/home ").unwrap(),
      "http://homelab:8096"
    );
    assert_eq!(
      normalize_url("https://jf.example.com/").unwrap(),
      "https://jf.example.com"
    );
    assert!(normalize_url("  ").is_err());
  }

  #[test]
  fn accepts_10_10_and_newer() {
    assert!(is_supported_version("10.11.11"));
    assert!(is_supported_version("10.10.0"));
    assert!(!is_supported_version("10.9.11"));
    assert!(!is_supported_version("abc"));
  }

  #[test]
  fn builds_the_auth_header() {
    let v = env!("CARGO_PKG_VERSION");
    assert_eq!(
      auth_header("d1", None),
      format!(r#"MediaBrowser Client="ArmySync", Device="Mac", DeviceId="d1", Version="{v}""#)
    );
    assert!(auth_header("d1", Some("t")).ends_with(r#", Token="t""#));
  }

  #[test]
  fn reads_a_session_from_an_auth_response() {
    let body = json!({"AccessToken":"tok","ServerId":"srv","User":{"Id":"u1","Name":"aldrie"}});
    let s = session_from_auth("http://h:8096", "Bobina", &body).unwrap();
    assert_eq!(
      (
        s.token.as_str(),
        s.user_id.as_str(),
        s.user_name.as_str(),
        s.server_id.as_str()
      ),
      ("tok", "u1", "aldrie", "srv")
    );
  }
}
