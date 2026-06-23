use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::inventory::service::{
    bulk_upsert_inventory_items, bulk_upsert_suppliers, create_inventory_item,
    create_stock_movement, create_supplier, delete_inventory_item, delete_stock_movement,
    delete_supplier, get_all_inventory_items, get_all_suppliers, get_stock_movements,
    update_inventory_item, update_supplier, BulkUpsertResult,
};
use crate::state::AppState;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkUpsertOptions {
    #[serde(default)]
    pub update_existing: bool,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct StockMovementFilters {
    pub item_id: Option<String>,
    #[serde(alias = "type")]
    pub movement_type: Option<String>,
    #[serde(default = "default_movement_limit")]
    pub limit: usize,
}

#[tauri::command]
pub fn inventory_create_item_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_inventory_item(&app, &session, data)
}

#[tauri::command]
pub fn inventory_get_all_items_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<Vec<Value>> {
    get_all_inventory_items(&app, &session)
}

#[tauri::command]
pub fn inventory_update_item_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    item_id: String,
    patch: Value,
) -> ActionResult<Value> {
    update_inventory_item(&app, &session, &item_id, patch)
}

#[tauri::command]
pub fn inventory_delete_item_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    item_id: String,
) -> ActionResult<bool> {
    delete_inventory_item(&app, &session, &item_id)
}

#[tauri::command]
pub fn inventory_bulk_upsert_items_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    rows: Vec<Value>,
    options: BulkUpsertOptions,
) -> ActionResult<BulkUpsertResult> {
    bulk_upsert_inventory_items(&app, &session, rows, options.update_existing)
}

#[tauri::command]
pub fn inventory_create_stock_movement_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_stock_movement(&app, &session, data)
}

#[tauri::command]
pub fn inventory_get_stock_movements_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    filters: StockMovementFilters,
) -> ActionResult<Vec<Value>> {
    get_stock_movements(
        &app,
        &session,
        filters.item_id.as_deref(),
        filters.movement_type.as_deref(),
        filters.limit,
    )
}

#[tauri::command]
pub fn inventory_delete_stock_movement_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    movement_id: String,
) -> ActionResult<bool> {
    delete_stock_movement(&app, &session, &movement_id)
}

#[tauri::command]
pub fn inventory_create_supplier_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_supplier(&app, &session, data)
}

#[tauri::command]
pub fn inventory_get_all_suppliers_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<Vec<Value>> {
    get_all_suppliers(&app, &session)
}

#[tauri::command]
pub fn inventory_update_supplier_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    supplier_id: String,
    patch: Value,
) -> ActionResult<Value> {
    update_supplier(&app, &session, &supplier_id, patch)
}

#[tauri::command]
pub fn inventory_delete_supplier_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    supplier_id: String,
) -> ActionResult<bool> {
    delete_supplier(&app, &session, &supplier_id)
}

#[tauri::command]
pub fn inventory_bulk_upsert_suppliers_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    rows: Vec<Value>,
    options: BulkUpsertOptions,
) -> ActionResult<BulkUpsertResult> {
    bulk_upsert_suppliers(&app, &session, rows, options.update_existing)
}

fn default_movement_limit() -> usize {
    100
}
