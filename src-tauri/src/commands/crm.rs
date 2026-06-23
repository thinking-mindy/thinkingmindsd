use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::crm::service::{
    add_deal_to_contact, create_contact, delete_contact, delete_deal_from_contact, get_contact,
    get_contacts_by_org, get_contacts_for_current_org, search_contacts, update_contact,
    update_deal_on_contact,
};
use crate::state::AppState;

#[tauri::command]
pub fn crm_create_contact_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_contact(&app, &session, data)
}

#[tauri::command]
pub fn crm_get_contact_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    contact_id: String,
) -> ActionResult<Value> {
    get_contact(&app, &session, &contact_id)
}

#[tauri::command]
pub fn crm_get_contacts_by_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
) -> ActionResult<Vec<Value>> {
    get_contacts_by_org(&app, &session, &org_id)
}

#[tauri::command]
pub fn crm_get_contacts_for_current_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    limit: Option<usize>,
) -> ActionResult<Vec<Value>> {
    get_contacts_for_current_org(&app, &session, limit.unwrap_or(500))
}

#[tauri::command]
pub fn crm_search_contacts_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
    query: String,
) -> ActionResult<Vec<Value>> {
    search_contacts(&app, &session, &org_id, &query)
}

#[tauri::command]
pub fn crm_update_contact_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    contact_id: String,
    data: Value,
) -> ActionResult<Value> {
    update_contact(&app, &session, &contact_id, data)
}

#[tauri::command]
pub fn crm_add_deal_to_contact_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    contact_id: String,
    deal: Value,
) -> ActionResult<Value> {
    add_deal_to_contact(&app, &session, &contact_id, deal)
}

#[tauri::command]
pub fn crm_update_deal_on_contact_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    contact_id: String,
    deal_id: String,
    data: Value,
) -> ActionResult<Value> {
    update_deal_on_contact(&app, &session, &contact_id, &deal_id, data)
}

#[tauri::command]
pub fn crm_delete_deal_from_contact_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    contact_id: String,
    deal_id: String,
) -> ActionResult<Value> {
    delete_deal_from_contact(&app, &session, &contact_id, &deal_id)
}

#[tauri::command]
pub fn crm_delete_contact_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    contact_id: String,
) -> ActionResult<bool> {
    delete_contact(&app, &session, &contact_id)
}
