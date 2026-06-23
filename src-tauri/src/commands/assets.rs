use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::assets::service::{
    assign_asset_to_user, create_asset, delete_asset, get_asset, get_asset_by_tag, get_assets_by_org,
    get_assets_by_status, get_assets_by_user, get_assets_for_current_org, update_asset,
};
use crate::auth::session::SessionState;
use crate::state::AppState;

#[tauri::command]
pub fn assets_create_asset_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_asset(&app, &session, data)
}

#[tauri::command]
pub fn assets_get_asset_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    asset_id: String,
) -> ActionResult<Value> {
    get_asset(&app, &session, &asset_id)
}

#[tauri::command]
pub fn assets_get_assets_by_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
) -> ActionResult<Vec<Value>> {
    get_assets_by_org(&app, &session, &org_id)
}

#[tauri::command]
pub fn assets_get_assets_for_current_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    limit: Option<usize>,
) -> ActionResult<Vec<Value>> {
    get_assets_for_current_org(&app, &session, limit.unwrap_or(500))
}

#[tauri::command]
pub fn assets_get_assets_by_status_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
    status: String,
) -> ActionResult<Vec<Value>> {
    get_assets_by_status(&app, &session, &org_id, &status)
}

#[tauri::command]
pub fn assets_get_assets_by_user_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    user_id: String,
) -> ActionResult<Vec<Value>> {
    get_assets_by_user(&app, &session, &user_id)
}

#[tauri::command]
pub fn assets_get_asset_by_tag_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    tag: String,
    org_id: String,
) -> ActionResult<Value> {
    get_asset_by_tag(&app, &session, &tag, &org_id)
}

#[tauri::command]
pub fn assets_update_asset_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    asset_id: String,
    data: Value,
) -> ActionResult<Value> {
    update_asset(&app, &session, &asset_id, data)
}

#[tauri::command]
pub fn assets_assign_asset_to_user_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    asset_id: String,
    user_id: String,
) -> ActionResult<Value> {
    assign_asset_to_user(&app, &session, &asset_id, &user_id)
}

#[tauri::command]
pub fn assets_delete_asset_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    asset_id: String,
) -> ActionResult<bool> {
    delete_asset(&app, &session, &asset_id)
}
