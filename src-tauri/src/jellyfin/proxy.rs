use std::sync::Arc;

use axum::body::Body;
use axum::extract::{Path, State as AxumState};
use axum::http::{header, HeaderMap, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use reqwest::Method;
use tauri::{AppHandle, Manager};

use super::client::{check_status, request};
use super::JellyfinState;

const PASSED_HEADERS: [header::HeaderName; 5] = [
  header::CONTENT_TYPE,
  header::CONTENT_LENGTH,
  header::CONTENT_RANGE,
  header::ACCEPT_RANGES,
  header::CACHE_CONTROL,
];

#[derive(Clone)]
struct Ctx {
  app: AppHandle,
  nonce: Arc<str>,
}

// ponytail: the webview runs on tauri://, so LAN http:// media is mixed content (and ATS-blocked); a loopback proxy also keeps the token out of videoSrc
pub(super) fn start(app: AppHandle, nonce: String) -> Result<u16, String> {
  let listener = std::net::TcpListener::bind("127.0.0.1:0")
    .map_err(|e| format!("Failed to start the media proxy: {e}"))?;
  listener
    .set_nonblocking(true)
    .map_err(|e| format!("Failed to start the media proxy: {e}"))?;
  let port = listener
    .local_addr()
    .map_err(|e| format!("Failed to start the media proxy: {e}"))?
    .port();
  let router = Router::new()
    .route("/{nonce}/{*path}", get(forward))
    .with_state(Ctx {
      app,
      nonce: nonce.into(),
    });
  tauri::async_runtime::spawn(async move {
    let result = match tokio::net::TcpListener::from_std(listener) {
      Ok(listener) => axum::serve(listener, router).await,
      Err(e) => Err(e),
    };
    if let Err(e) = result {
      eprintln!("[jellyfin] proxy error: {e}");
    }
  });
  Ok(port)
}

async fn forward(
  AxumState(ctx): AxumState<Ctx>,
  Path((nonce, path)): Path<(String, String)>,
  uri: Uri,
  headers: HeaderMap,
) -> Response {
  if nonce != *ctx.nonce {
    return StatusCode::NOT_FOUND.into_response();
  }
  let Some(state) = ctx.app.try_state::<JellyfinState>() else {
    return StatusCode::SERVICE_UNAVAILABLE.into_response();
  };
  let Some(session) = state.session() else {
    return StatusCode::UNAUTHORIZED.into_response();
  };
  let url = match uri.query() {
    Some(query) => format!("{}/{path}?{query}", session.url),
    None => format!("{}/{path}", session.url),
  };
  let mut req = request(&state, Method::GET, &url, Some(&session.token));
  if let Some(range) = headers.get(header::RANGE) {
    req = req.header(header::RANGE, range);
  }
  let res = match req.send().await {
    Ok(res) => res,
    Err(e) => {
      return (
        StatusCode::BAD_GATEWAY,
        format!("Can't reach Jellyfin: {e}"),
      )
        .into_response()
    }
  };
  let _ = check_status(&state, &session.token, res.status().as_u16());
  let mut out = Response::builder().status(res.status());
  for name in PASSED_HEADERS {
    if let Some(value) = res.headers().get(&name) {
      out = out.header(name, value);
    }
  }
  out
    .body(Body::from_stream(res.bytes_stream()))
    .unwrap_or_else(|_| StatusCode::BAD_GATEWAY.into_response())
}
