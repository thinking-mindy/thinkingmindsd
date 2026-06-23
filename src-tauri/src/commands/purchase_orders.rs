use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::purchase_orders::service::{
    approve_purchase_order, create_purchase_order, delete_purchase_order, get_purchase_order,
    get_purchase_orders_by_org, get_purchase_orders_by_status, get_purchase_orders_by_vendor,
    get_purchase_orders_for_current_org, update_purchase_order,
};
use crate::state::AppState;

#[tauri::command]
pub fn purchase_orders_create_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_purchase_order(&app, &session, data)
}

#[tauri::command]
pub fn purchase_orders_get_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    po_number: String,
) -> ActionResult<Value> {
    get_purchase_order(&app, &session, &po_number)
}

#[tauri::command]
pub fn purchase_orders_get_by_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
) -> ActionResult<Vec<Value>> {
    get_purchase_orders_by_org(&app, &session, &org_id)
}

#[tauri::command]
pub fn purchase_orders_get_for_current_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    limit: Option<usize>,
) -> ActionResult<Vec<Value>> {
    get_purchase_orders_for_current_org(&app, &session, limit.unwrap_or(50))
}

#[tauri::command]
pub fn purchase_orders_get_by_status_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
    status: String,
) -> ActionResult<Vec<Value>> {
    get_purchase_orders_by_status(&app, &session, &org_id, &status)
}

#[tauri::command]
pub fn purchase_orders_get_by_vendor_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
    vendor: String,
) -> ActionResult<Vec<Value>> {
    get_purchase_orders_by_vendor(&app, &session, &org_id, &vendor)
}

#[tauri::command]
pub fn purchase_orders_update_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    po_number: String,
    data: Value,
) -> ActionResult<Value> {
    update_purchase_order(&app, &session, &po_number, data)
}

#[tauri::command]
pub fn purchase_orders_approve_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    po_number: String,
    approved_by: String,
) -> ActionResult<Value> {
    approve_purchase_order(&app, &session, &po_number, &approved_by)
}

#[tauri::command]
pub fn purchase_orders_delete_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    po_number: String,
) -> ActionResult<bool> {
    delete_purchase_order(&app, &session, &po_number)
}
