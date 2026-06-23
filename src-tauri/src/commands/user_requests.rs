use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::state::AppState;
use crate::user_requests::service::{
    create_user_request, delete_user_request, get_user_request, get_user_requests_by_org, get_user_requests_by_status,
    get_user_requests_by_user, get_user_requests_for_current_org, update_user_request,
};

#[tauri::command]
pub fn user_requests_create_user_request_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_user_request(&app, &session, data)
}

#[tauri::command]
pub fn user_requests_get_user_request_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    request_id: String,
) -> ActionResult<Value> {
    get_user_request(&app, &session, &request_id)
}

#[tauri::command]
pub fn user_requests_get_user_requests_by_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
) -> ActionResult<Vec<Value>> {
    get_user_requests_by_org(&app, &session, &org_id)
}

#[tauri::command]
pub fn user_requests_get_user_requests_for_current_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    limit: Option<usize>,
) -> ActionResult<Vec<Value>> {
    get_user_requests_for_current_org(&app, &session, limit.unwrap_or(300))
}

#[tauri::command]
pub fn user_requests_get_user_requests_by_user_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    user_id: String,
) -> ActionResult<Vec<Value>> {
    get_user_requests_by_user(&app, &session, &user_id)
}

#[tauri::command]
pub fn user_requests_get_user_requests_by_status_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
    status: String,
) -> ActionResult<Vec<Value>> {
    get_user_requests_by_status(&app, &session, &org_id, &status)
}

#[tauri::command]
pub fn user_requests_update_user_request_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    request_id: String,
    data: Value,
) -> ActionResult<Value> {
    update_user_request(&app, &session, &request_id, data)
}

#[tauri::command]
pub fn user_requests_delete_user_request_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    request_id: String,
) -> ActionResult<bool> {
    delete_user_request(&app, &session, &request_id)
}
