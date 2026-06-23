use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::audit::service::{
    create_audit_log, delete_old_audit_logs, get_audit_log, get_audit_logs_by_action, get_audit_logs_by_actor,
    get_audit_logs_by_date_range, get_audit_logs_by_org, get_audit_logs_by_resource,
};
use crate::auth::session::SessionState;
use crate::state::AppState;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditResourceFilterInput {
    pub org_id: String,
    pub resource: String,
    pub resource_id: Option<String>,
}

#[tauri::command]
pub fn audit_create_audit_log_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_audit_log(&app, &session, data)
}

#[tauri::command]
pub fn audit_get_audit_log_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    log_id: String,
) -> ActionResult<Value> {
    get_audit_log(&app, &session, &log_id)
}

#[tauri::command]
pub fn audit_get_audit_logs_by_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
    limit: Option<usize>,
) -> ActionResult<Vec<Value>> {
    get_audit_logs_by_org(&app, &session, &org_id, limit.unwrap_or(100))
}

#[tauri::command]
pub fn audit_get_audit_logs_by_actor_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    actor_id: String,
    limit: Option<usize>,
) -> ActionResult<Vec<Value>> {
    get_audit_logs_by_actor(&app, &session, &actor_id, limit.unwrap_or(100))
}

#[tauri::command]
pub fn audit_get_audit_logs_by_resource_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: AuditResourceFilterInput,
) -> ActionResult<Vec<Value>> {
    get_audit_logs_by_resource(
        &app,
        &session,
        &input.org_id,
        &input.resource,
        input.resource_id.as_deref(),
    )
}

#[tauri::command]
pub fn audit_get_audit_logs_by_action_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
    action: String,
) -> ActionResult<Vec<Value>> {
    get_audit_logs_by_action(&app, &session, &org_id, &action)
}

#[tauri::command]
pub fn audit_get_audit_logs_by_date_range_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
    start_date_iso: String,
    end_date_iso: String,
) -> ActionResult<Vec<Value>> {
    get_audit_logs_by_date_range(&app, &session, &org_id, &start_date_iso, &end_date_iso)
}

#[tauri::command]
pub fn audit_delete_old_audit_logs_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    before_date_iso: String,
) -> ActionResult<i64> {
    delete_old_audit_logs(&app, &session, &before_date_iso)
}
