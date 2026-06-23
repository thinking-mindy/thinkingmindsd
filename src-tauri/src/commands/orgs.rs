use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::orgs::service::{
    create_org, get_org, search_orgs, sync_local_org_to_database, SyncLocalOrgInput,
};
use crate::state::AppState;

#[tauri::command]
pub fn org_create_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> Result<ActionResult<Value>, String> {
    create_org(&app, &session, data)
}

#[tauri::command]
pub fn org_get_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
) -> Result<ActionResult<Value>, String> {
    get_org(&app, &session, &org_id)
}

#[tauri::command]
pub fn org_search_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    query: String,
    limit: Option<usize>,
) -> Result<ActionResult<Vec<Value>>, String> {
    search_orgs(&app, &session, &query, limit.unwrap_or(10))
}

#[tauri::command]
pub fn org_sync_local_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: Option<SyncLocalOrgInput>,
) -> Result<ActionResult<Value>, String> {
    sync_local_org_to_database(&app, &session, input)
}
