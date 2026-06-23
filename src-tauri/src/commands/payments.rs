use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::payments::service::{
    check_plan_payment_status, get_payments_for_current_org, get_payments_for_org,
    initiate_plan_payment, initiate_pos_paynow_payment, InitiatePlanPaymentInput,
    InitiatePosPaynowPaymentInput,
};
use crate::state::AppState;

#[tauri::command]
pub fn payments_get_for_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
) -> Result<ActionResult<Vec<Value>>, String> {
    get_payments_for_org(&app, &session, org_id)
}

#[tauri::command]
pub fn payments_get_for_current_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> Result<ActionResult<Vec<Value>>, String> {
    get_payments_for_current_org(&app, &session)
}

#[tauri::command]
pub fn payments_initiate_plan_payment_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: InitiatePlanPaymentInput,
) -> Result<ActionResult<Value>, String> {
    initiate_plan_payment(&app, &session, input)
}

#[tauri::command]
pub fn payments_check_plan_payment_status_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    payment_id: String,
) -> Result<ActionResult<Value>, String> {
    check_plan_payment_status(&app, &session, payment_id)
}

#[tauri::command]
pub fn payments_initiate_pos_paynow_payment_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: InitiatePosPaynowPaymentInput,
) -> Result<ActionResult<Value>, String> {
    initiate_pos_paynow_payment(&app, &session, input)
}
