use std::path::{Path, PathBuf};

use serde_json::Value;

use super::models::OfflineUser;
use super::password::hash_password;

const USERS_FILE: &str = "offline-users.json";

pub fn users_path(secrets_dir: &Path) -> PathBuf {
    secrets_dir.join(USERS_FILE)
}

pub fn load_users(secrets_dir: &Path) -> Result<Vec<OfflineUser>, String> {
    let path = users_path(secrets_dir);
    if !path.exists() {
        return Ok(vec![]);
    }
    let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    if raw.trim().is_empty() {
        return Ok(vec![]);
    }
    serde_json::from_str(&raw).map_err(|e| format!("parse users: {e}"))
}

pub fn save_users(secrets_dir: &Path, users: &[OfflineUser]) -> Result<(), String> {
    let path = users_path(secrets_dir);
    let content = serde_json::to_string_pretty(users).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

pub fn find_user_by_identifier<'a>(
    users: &'a [OfflineUser],
    identifier: &str,
) -> Option<&'a OfflineUser> {
    let normalized = identifier.trim().to_lowercase();
    users.iter().find(|u| {
        u.email.to_lowercase() == normalized
            || u.username
                .as_ref()
                .map(|n| n.to_lowercase() == normalized)
                .unwrap_or(false)
    })
}

pub fn register_user(
    secrets_dir: &Path,
    email: &str,
    password: &str,
    username: Option<String>,
    first_name: Option<String>,
    last_name: Option<String>,
    metadata: Option<Value>,
) -> Result<OfflineUser, String> {
    let mut users = load_users(secrets_dir)?;
    let normalized_email = email.trim().to_lowercase();
    let normalized_username = username
        .as_ref()
        .map(|u| u.trim().to_lowercase())
        .filter(|u| !u.is_empty());

    if find_user_by_identifier(&users, &normalized_email).is_some() {
        return Err("User already exists".into());
    }
    if let Some(ref uname) = normalized_username {
        if users
            .iter()
            .any(|u| u.username.as_ref().map(|n| n.to_lowercase()) == Some(uname.clone()))
        {
            return Err("User already exists".into());
        }
    }

    let user = OfflineUser {
        id: super::models::make_user_id(),
        username: normalized_username,
        email: normalized_email,
        password_hash: hash_password(password),
        first_name: first_name.filter(|s| !s.trim().is_empty()),
        last_name: last_name.filter(|s| !s.trim().is_empty()),
        company_id: None,
        metadata,
        created_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0),
    };

    users.push(user.clone());
    save_users(secrets_dir, &users)?;
    Ok(user)
}

pub fn update_user(
    secrets_dir: &Path,
    user_id: &str,
    patch: OfflineUserPatch,
) -> Result<OfflineUser, String> {
    let mut users = load_users(secrets_dir)?;
    let index = users
        .iter()
        .position(|u| u.id == user_id)
        .ok_or_else(|| "User not found".to_string())?;

    if let Some(username) = patch.username {
        users[index].username = Some(username);
    }
    if let Some(first_name) = patch.first_name {
        users[index].first_name = Some(first_name);
    }
    if let Some(last_name) = patch.last_name {
        users[index].last_name = Some(last_name);
    }
    if let Some(company_id) = patch.company_id {
        users[index].company_id = Some(company_id);
    }
    if let Some(metadata) = patch.metadata {
        users[index].metadata = Some(metadata);
    }

    let updated = users[index].clone();
    save_users(secrets_dir, &users)?;
    Ok(updated)
}

pub fn delete_user(secrets_dir: &Path, user_id: &str) -> Result<(), String> {
    let mut users = load_users(secrets_dir)?;
    let len_before = users.len();
    users.retain(|u| u.id != user_id);
    if users.len() == len_before {
        return Err("User not found".into());
    }
    save_users(secrets_dir, &users)
}

#[derive(Default)]
pub struct OfflineUserPatch {
    pub username: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub company_id: Option<String>,
    pub metadata: Option<Value>,
}
