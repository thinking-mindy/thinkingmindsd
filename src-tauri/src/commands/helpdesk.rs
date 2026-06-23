use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::helpdesk::service::{
    add_message_to_ticket, assign_ticket, create_ticket, delete_ticket, get_ticket, get_tickets_by_assigned,
    get_tickets_by_creator, get_tickets_by_org, get_tickets_by_status, get_tickets_for_current_org, update_ticket,
};
use crate::state::AppState;

#[tauri::command]
pub fn helpdesk_create_ticket_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_ticket(&app, &session, data)
}

#[tauri::command]
pub fn helpdesk_get_ticket_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    ticket_id: String,
) -> ActionResult<Value> {
    get_ticket(&app, &session, &ticket_id)
}

#[tauri::command]
pub fn helpdesk_get_tickets_by_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
) -> ActionResult<Vec<Value>> {
    get_tickets_by_org(&app, &session, &org_id)
}

#[tauri::command]
pub fn helpdesk_get_tickets_for_current_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    limit: Option<usize>,
) -> ActionResult<Vec<Value>> {
    get_tickets_for_current_org(&app, &session, limit.unwrap_or(200))
}

#[tauri::command]
pub fn helpdesk_get_tickets_by_status_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
    status: String,
) -> ActionResult<Vec<Value>> {
    get_tickets_by_status(&app, &session, &org_id, &status)
}

#[tauri::command]
pub fn helpdesk_get_tickets_by_assigned_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    user_id: String,
) -> ActionResult<Vec<Value>> {
    get_tickets_by_assigned(&app, &session, &user_id)
}

#[tauri::command]
pub fn helpdesk_get_tickets_by_creator_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    user_id: String,
) -> ActionResult<Vec<Value>> {
    get_tickets_by_creator(&app, &session, &user_id)
}

#[tauri::command]
pub fn helpdesk_update_ticket_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    ticket_id: String,
    data: Value,
) -> ActionResult<Value> {
    update_ticket(&app, &session, &ticket_id, data)
}

#[tauri::command]
pub fn helpdesk_add_message_to_ticket_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    ticket_id: String,
    message: Value,
) -> ActionResult<Value> {
    add_message_to_ticket(&app, &session, &ticket_id, message)
}

#[tauri::command]
pub fn helpdesk_assign_ticket_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    ticket_id: String,
    user_id: String,
) -> ActionResult<Value> {
    assign_ticket(&app, &session, &ticket_id, &user_id)
}

#[tauri::command]
pub fn helpdesk_delete_ticket_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    ticket_id: String,
) -> ActionResult<bool> {
    delete_ticket(&app, &session, &ticket_id)
}
