use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::join_requests::service::{
    approve_join_request, create_join_request, get_join_requests_for_current_org,
    import_offline_join_requests, reject_join_request, OfflineJoinRequestInput,
};
use crate::state::AppState;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateJoinRequestInput {
    pub org_id: String,
    pub user_email: String,
    pub user_name: String,
}

#[tauri::command]
pub fn join_requests_create_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: CreateJoinRequestInput,
) -> Result<ActionResult<Value>, String> {
    create_join_request(
        &app,
        &session,
        input.org_id,
        input.user_email,
        input.user_name,
    )
}

#[tauri::command]
pub fn join_requests_get_for_current_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> Result<ActionResult<Vec<Value>>, String> {
    get_join_requests_for_current_org(&app, &session)
}

#[tauri::command]
pub fn join_requests_import_offline_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    requests: Vec<OfflineJoinRequestInput>,
) -> Result<ActionResult<Value>, String> {
    import_offline_join_requests(&app, &session, requests)
}

#[tauri::command]
pub fn join_requests_approve_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    request_id: String,
) -> Result<ActionResult<()>, String> {
    approve_join_request(&app, &session, request_id)
}

#[tauri::command]
pub fn join_requests_reject_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    request_id: String,
) -> Result<ActionResult<()>, String> {
    reject_join_request(&app, &session, request_id)
}
