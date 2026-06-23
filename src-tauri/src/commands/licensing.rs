use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::licensing::renewal::{
    get_renewal_options, initiate_renewal_payment, peek_renewal_org, poll_renewal_status,
    register_renewal_org,
};
use crate::licensing::service::{
    extend_license, get_license_status, get_license_status_for_current_user, has_module_access,
    refresh_license_from_remote, sync_license_from_server, LicenseStatusDto, ModuleAccessResult,
};
use serde_json::Value;
use crate::state::AppState;

#[tauri::command]
pub fn license_get_status_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
) -> Result<Option<LicenseStatusDto>, String> {
    get_license_status(&app, &session, &org_id)
}

#[tauri::command]
pub fn license_get_status_for_current_user_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> Result<Option<LicenseStatusDto>, String> {
    get_license_status_for_current_user(&app, &session)
}

#[tauri::command]
pub fn license_sync_from_server_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> Result<ActionResult<LicenseStatusDto>, String> {
    sync_license_from_server(&app, &session)
}

#[tauri::command]
pub fn license_refresh_from_remote_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> Result<ActionResult<LicenseStatusDto>, String> {
    refresh_license_from_remote(&app, &session)
}

#[tauri::command]
pub fn license_extend_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
    expires_at: String,
) -> Result<ActionResult<()>, String> {
    extend_license(&app, &session, &org_id, &expires_at)
}

#[tauri::command]
pub fn license_has_module_access_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    module_path: String,
) -> Result<ModuleAccessResult, String> {
    has_module_access(&app, &session, &module_path)
}

#[tauri::command]
pub fn license_renewal_get_options_cmd() -> Result<Value, String> {
    get_renewal_options()
}

#[tauri::command]
pub fn license_renewal_peek_cmd(query: String) -> Result<Value, String> {
    peek_renewal_org(query)
}

#[tauri::command]
pub fn license_renewal_register_cmd(
    org_id: String,
    license_type: String,
    org_name: String,
) -> Result<Value, String> {
    register_renewal_org(org_id, license_type, org_name)
}

#[tauri::command]
pub fn license_renewal_pay_cmd(
    org_id: String,
    license_type: String,
    phone_number: String,
    contact_name: Option<String>,
) -> Result<Value, String> {
    initiate_renewal_payment(org_id, license_type, phone_number, contact_name)
}

#[tauri::command]
pub fn license_renewal_poll_status_cmd(renewal_id: String) -> Result<Value, String> {
    poll_renewal_status(renewal_id)
}
