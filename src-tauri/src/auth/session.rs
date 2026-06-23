use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use super::models::{OfflineUser, StoredSession};

const SESSION_FILE: &str = "session.json";
const MAX_AGE_MS: i64 = 24 * 60 * 60 * 1000;

pub struct SessionState(pub Mutex<Option<StoredSession>>);

impl SessionState {
    pub fn new() -> Self {
        Self(Mutex::new(None))
    }

    pub fn load_from_disk(secrets_dir: &Path) -> Option<StoredSession> {
        let path = session_path(secrets_dir);
        if !path.exists() {
            return None;
        }
        let raw = std::fs::read_to_string(&path).ok()?;
        let session: StoredSession = serde_json::from_str(&raw).ok()?;
        if session_expired(&session) {
            let _ = std::fs::remove_file(path);
            return None;
        }
        Some(session)
    }

    pub fn restore(&self, secrets_dir: &Path) {
        if let Some(session) = Self::load_from_disk(secrets_dir) {
            if let Ok(mut guard) = self.0.lock() {
                *guard = Some(session);
            }
        }
    }
}

pub fn session_path(secrets_dir: &Path) -> PathBuf {
    secrets_dir.join(SESSION_FILE)
}

pub fn session_expired(session: &StoredSession) -> bool {
    now_ms() - session.timestamp > MAX_AGE_MS
}

pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub fn start_session(
    secrets_dir: &Path,
    session_state: &SessionState,
    user: &OfflineUser,
) -> Result<(), String> {
    let session = StoredSession {
        user_id: user.id.clone(),
        email: user.email.clone(),
        timestamp: now_ms(),
    };
    let path = session_path(secrets_dir);
    let content = serde_json::to_string_pretty(&session).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    let mut guard = session_state
        .0
        .lock()
        .map_err(|_| "session lock poisoned".to_string())?;
    *guard = Some(session);
    Ok(())
}

pub fn clear_session(secrets_dir: &Path, session_state: &SessionState) -> Result<(), String> {
    let path = session_path(secrets_dir);
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    let mut guard = session_state
        .0
        .lock()
        .map_err(|_| "session lock poisoned".to_string())?;
    *guard = None;
    Ok(())
}

pub fn active_session(session_state: &SessionState) -> Option<StoredSession> {
    let guard = session_state.0.lock().ok()?;
    guard.clone().filter(|s| !session_expired(s))
}

pub fn session_max_age() -> Duration {
    Duration::from_millis(MAX_AGE_MS as u64)
}
