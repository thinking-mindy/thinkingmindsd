use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::fiscal::service::{
    close_fiscal_day, fiscalise_credit_note, fiscalise_sale, get_settings, open_fiscal_day,
    ping_device, refresh_status, register_device, sync_config, update_settings, verify_taxpayer,
    FiscalFlexibleResult,
};
use crate::state::AppState;

#[tauri::command]
pub fn fiscal_get_settings_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<Value> {
    get_settings(&app, &session)
}

#[tauri::command]
pub fn fiscal_update_settings_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    patch: Value,
) -> ActionResult<()> {
    update_settings(&app, &session, patch)
}

#[tauri::command]
pub fn fiscal_sync_config_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<Value> {
    sync_config(&app, &session)
}

#[tauri::command]
pub fn fiscal_verify_taxpayer_cmd(
    device_id: i64,
    activation_key: String,
    environment: String,
) -> ActionResult<Value> {
    verify_taxpayer(device_id, activation_key, environment)
}

#[tauri::command]
pub fn fiscal_ping_device_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<Value> {
    ping_device(&app, &session)
}

#[tauri::command]
pub fn fiscal_refresh_status_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<Value> {
    refresh_status(&app, &session)
}

#[tauri::command]
pub fn fiscal_open_day_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<Value> {
    open_fiscal_day(&app, &session)
}

#[tauri::command]
pub fn fiscal_close_day_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<Value> {
    close_fiscal_day(&app, &session)
}

#[tauri::command]
pub fn fiscal_register_device_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    environment: String,
    device_id: i64,
    device_serial_no: String,
    activation_key: String,
    device_model_name: Option<String>,
    device_model_version: Option<String>,
) -> ActionResult<Value> {
    register_device(
        &app,
        &session,
        environment,
        device_id,
        device_serial_no,
        activation_key,
        device_model_name,
        device_model_version,
    )
}

#[tauri::command]
pub fn fiscal_fiscalise_sale_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    order_id: Option<String>,
    invoice_no: String,
    items: Vec<Value>,
    payments: Vec<Value>,
    tax_enabled: Option<bool>,
) -> FiscalFlexibleResult {
    fiscalise_sale(
        &app,
        &session,
        order_id,
        invoice_no,
        items,
        payments,
        tax_enabled,
    )
}

#[tauri::command]
pub fn fiscal_fiscalise_credit_note_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    order_id: String,
    receipt_notes: Option<String>,
) -> FiscalFlexibleResult {
    fiscalise_credit_note(&app, &session, order_id, receipt_notes)
}
