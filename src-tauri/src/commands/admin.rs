use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use crate::admin::service::{
    admin_approve_join_request, admin_delete_local_company, admin_delete_local_user,
    admin_list_local_companies, admin_list_local_users, admin_load_panel, admin_reject_join_request,
    admin_update_org, admin_update_org_plan, admin_update_user_modules, ActionResult,
    AdminLoadPanelDto,
};
use crate::auth::session::SessionState;
use crate::state::AppState;

#[tauri::command]
pub fn admin_load_panel_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> Result<AdminLoadPanelDto, String> {
    admin_load_panel(&app, &session)
}

#[tauri::command]
pub fn admin_update_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    company_id: String,
    patch: Value,
) -> Result<ActionResult<Value>, String> {
    admin_update_org(&app, &session, company_id, patch)
}

#[tauri::command]
pub fn admin_update_org_plan_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    company_id: String,
    plan_id: String,
) -> Result<ActionResult<Value>, String> {
    admin_update_org_plan(&app, &session, company_id, plan_id)
}

#[tauri::command]
pub fn admin_approve_join_request_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    request_id: String,
) -> Result<ActionResult<()>, String> {
    admin_approve_join_request(&app, &session, request_id)
}

#[tauri::command]
pub fn admin_reject_join_request_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    request_id: String,
) -> Result<ActionResult<()>, String> {
    admin_reject_join_request(&app, &session, request_id)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserModulesInput {
    pub user_id: String,
    pub allowed_modules: Vec<String>,
}

#[tauri::command]
pub fn admin_update_user_modules_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: UpdateUserModulesInput,
) -> Result<ActionResult<()>, String> {
    admin_update_user_modules(&app, &session, input.user_id, input.allowed_modules)
}

#[tauri::command]
pub fn admin_list_local_users_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> Result<ActionResult<Vec<Value>>, String> {
    admin_list_local_users(&app, &session)
}

#[tauri::command]
pub fn admin_list_local_companies_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> Result<ActionResult<Vec<Value>>, String> {
    admin_list_local_companies(&app, &session)
}

#[tauri::command]
pub fn admin_delete_local_user_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    user_id: String,
) -> Result<ActionResult<()>, String> {
    admin_delete_local_user(&app, &session, user_id)
}

#[tauri::command]
pub fn admin_delete_local_company_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    company_id: String,
) -> Result<ActionResult<()>, String> {
    admin_delete_local_company(&app, &session, company_id)
}
