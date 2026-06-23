use serde::Serialize;
use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::models::{OfflineUserSafe, PublicProfile};
use crate::auth::service::{self, CompanyOption};
use crate::auth::session::SessionState;
use crate::state::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthLoginResponse {
    pub user: OfflineUserSafe,
    pub session_user: Value,
}

#[tauri::command]
pub fn auth_login(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    identifier: String,
    password: String,
) -> Result<AuthLoginResponse, String> {
    let user = service::authenticate(&app, &session, &identifier, &password)?;
    Ok(AuthLoginResponse {
        session_user: service::session_user_json(&user),
        user: user.without_password(),
    })
}

#[tauri::command]
pub fn auth_logout(app: State<'_, AppState>, session: State<'_, SessionState>) -> Result<(), String> {
    service::logout(&app, &session)
}

#[tauri::command]
pub fn auth_get_current_user(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> Result<Option<AuthLoginResponse>, String> {
    let user = service::get_current_user(&app, &session);
    Ok(user.map(|u| AuthLoginResponse {
        session_user: service::session_user_json(&u),
        user: u.without_password(),
    }))
}

#[tauri::command]
pub fn auth_list_public_profiles(app: State<'_, AppState>) -> Result<Vec<PublicProfile>, String> {
    service::list_public_profiles(&app)
}

#[tauri::command]
pub fn auth_has_users(app: State<'_, AppState>) -> Result<bool, String> {
    service::has_users(&app)
}

#[tauri::command]
pub fn auth_register_owner(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    email: String,
    password: String,
    username: Option<String>,
    first_name: Option<String>,
    last_name: Option<String>,
    company_name: String,
) -> Result<AuthLoginResponse, String> {
    let user = service::register_owner(
        &app,
        &session,
        &email,
        &password,
        username,
        first_name,
        last_name,
        &company_name,
    )?;
    Ok(AuthLoginResponse {
        session_user: service::session_user_json(&user),
        user: user.without_password(),
    })
}

#[tauri::command]
pub fn auth_register_join(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    email: String,
    password: String,
    username: Option<String>,
    first_name: Option<String>,
    last_name: Option<String>,
    company_id: String,
    company_name: String,
    owner_id: String,
) -> Result<AuthLoginResponse, String> {
    let user = service::register_join(
        &app,
        &session,
        &email,
        &password,
        username,
        first_name,
        last_name,
        &company_id,
        &company_name,
        &owner_id,
    )?;
    Ok(AuthLoginResponse {
        session_user: service::session_user_json(&user),
        user: user.without_password(),
    })
}

#[tauri::command]
pub fn auth_list_companies(app: State<'_, AppState>) -> Result<Vec<CompanyOption>, String> {
    service::list_companies_for_register(&app)
}

#[tauri::command]
pub fn auth_list_offline_users(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> Result<Vec<OfflineUserSafe>, String> {
    let _ = crate::admin::access::require_owner(&app, &session)?;
    Ok(crate::auth::users::load_users(&app.secrets_dir())?
        .into_iter()
        .map(|u| u.without_password())
        .collect())
}

#[tauri::command]
pub fn auth_delete_offline_user(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    user_id: String,
) -> Result<ActionResult<()>, String> {
    let ctx = crate::admin::access::require_owner(&app, &session)?;
    if ctx.user.id == user_id {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some("You cannot delete your own account while signed in".into()),
        });
    }
    crate::auth::users::delete_user(&app.secrets_dir(), &user_id)?;
    Ok(ActionResult {
        success: true,
        data: Some(()),
        error: None,
    })
}
