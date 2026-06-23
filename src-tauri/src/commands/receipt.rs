use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::receipt::service::{
    get_receipt_design_for_current_org, update_receipt_design_for_current_org,
};
use crate::state::AppState;

#[tauri::command]
pub fn receipt_get_design_for_current_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<Value> {
    get_receipt_design_for_current_org(&app, &session)
}

#[tauri::command]
pub fn receipt_update_design_for_current_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    settings: Value,
) -> ActionResult<Value> {
    update_receipt_design_for_current_org(&app, &session, settings)
}
