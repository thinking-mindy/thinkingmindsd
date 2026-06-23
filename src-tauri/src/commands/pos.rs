use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::pos::service::{
    complete_pos_order, create_pos_order, get_inventory_items_for_pos, get_menu_categories,
    get_menu_items, get_pos_orders, get_pos_register_activity, sync_inventory_item_to_pos,
};
use crate::state::AppState;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletePosOrderInput {
    pub order_id: String,
    pub method: String,
    #[serde(default)]
    pub reference: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncInventoryToPosInput {
    pub inventory_item_id: String,
    pub category_id: String,
    #[serde(default)]
    pub options: Value,
}

#[tauri::command]
pub fn pos_create_order_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_pos_order(&app, &session, data)
}

#[tauri::command]
pub fn pos_complete_order_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: CompletePosOrderInput,
) -> ActionResult<Value> {
    complete_pos_order(
        &app,
        &session,
        &input.order_id,
        &input.method,
        input.reference.as_deref(),
    )
}

#[tauri::command]
pub fn pos_get_orders_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    limit: Option<usize>,
) -> ActionResult<Vec<Value>> {
    get_pos_orders(&app, &session, limit.unwrap_or(50))
}

#[tauri::command]
pub fn pos_get_register_activity_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    limit: Option<usize>,
) -> ActionResult<Vec<Value>> {
    get_pos_register_activity(&app, &session, limit.unwrap_or(100))
}

#[tauri::command]
pub fn pos_get_menu_categories_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<Vec<Value>> {
    get_menu_categories(&app, &session)
}

#[tauri::command]
pub fn pos_get_menu_items_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    category_id: Option<String>,
    include_unavailable: Option<bool>,
) -> ActionResult<Vec<Value>> {
    get_menu_items(
        &app,
        &session,
        category_id.as_deref(),
        include_unavailable.unwrap_or(false),
    )
}

#[tauri::command]
pub fn pos_sync_inventory_to_pos_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: SyncInventoryToPosInput,
) -> ActionResult<Value> {
    sync_inventory_item_to_pos(
        &app,
        &session,
        &input.inventory_item_id,
        &input.category_id,
        input.options,
    )
}

#[tauri::command]
pub fn pos_get_inventory_items_for_pos_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<Vec<Value>> {
    get_inventory_items_for_pos(&app, &session)
}
