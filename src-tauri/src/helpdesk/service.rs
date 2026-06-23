use serde_json::{json, Map, Value};

use crate::admin::access::{doc_id, org_id_matches, session_org, value_as_id};
use crate::admin::service::ActionResult;
use crate::auth::models::make_object_id;
use crate::auth::session::SessionState;
use crate::state::AppState;
use crate::store_util::{
    action_err, action_ok, delete_doc_by_id, doc_created_ms, get_doc, insert_org_doc, iso_now, read_org_docs,
    update_doc_by_id,
};

const HELP_DESK_TICKETS: &str = "helpdesk_tickets";

pub fn create_ticket(app: &AppState, session: &SessionState, data: Value) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut payload = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid ticket payload"),
    };
    payload.remove("_id");
    payload.remove("ticketId");
    payload.insert("orgId".into(), json!(org_id.clone()));
    payload.insert("createdAt".into(), json!(iso_now()));
    payload.insert("updatedAt".into(), json!(iso_now()));

    let inserted = match insert_org_doc(app, HELP_DESK_TICKETS, &org_id, payload) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let ticket_id = doc_id(&inserted).unwrap_or_else(make_object_id);
    let mut patch = Map::new();
    patch.insert("ticketId".into(), json!(ticket_id));
    match update_doc_by_id(app, HELP_DESK_TICKETS, &ticket_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(inserted),
        Err(_) => action_ok(inserted),
    }
}

pub fn get_ticket(app: &AppState, session: &SessionState, ticket_id: &str) -> ActionResult<Value> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    match get_doc(app, HELP_DESK_TICKETS, ticket_id) {
        Ok(v) => action_ok(v),
        Err(_) => action_ok(Value::Null),
    }
}

pub fn get_tickets_by_org(app: &AppState, session: &SessionState, org_id: &str) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, HELP_DESK_TICKETS, org_id).unwrap_or_default();
    rows.sort_by(|a, b| doc_created_ms(b).cmp(&doc_created_ms(a)));
    action_ok(rows)
}

pub fn get_tickets_for_current_org(app: &AppState, session: &SessionState, limit: usize) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, HELP_DESK_TICKETS, &org_id).unwrap_or_default();
    rows.sort_by(|a, b| doc_created_ms(b).cmp(&doc_created_ms(a)));
    rows.truncate(limit);
    action_ok(rows)
}

pub fn get_tickets_by_status(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
    status: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, HELP_DESK_TICKETS, org_id)
        .unwrap_or_default()
        .into_iter()
        .filter(|row| row.get("status").and_then(|v| v.as_str()) == Some(status))
        .collect::<Vec<_>>();
    rows.sort_by(|a, b| doc_created_ms(b).cmp(&doc_created_ms(a)));
    action_ok(rows)
}

pub fn get_tickets_by_assigned(
    app: &AppState,
    session: &SessionState,
    user_id: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = all_tickets(app)
        .into_iter()
        .filter(|row| {
            row.get("assignedTo")
                .and_then(value_as_id)
                .as_deref()
                == Some(user_id)
                || row.get("assignedTo").and_then(|v| v.as_str()) == Some(user_id)
        })
        .collect::<Vec<_>>();
    rows.sort_by(|a, b| doc_created_ms(b).cmp(&doc_created_ms(a)));
    action_ok(rows)
}

pub fn get_tickets_by_creator(app: &AppState, session: &SessionState, user_id: &str) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = all_tickets(app)
        .into_iter()
        .filter(|row| {
            row.get("createdBy")
                .and_then(value_as_id)
                .as_deref()
                == Some(user_id)
                || row.get("createdBy").and_then(|v| v.as_str()) == Some(user_id)
        })
        .collect::<Vec<_>>();
    rows.sort_by(|a, b| doc_created_ms(b).cmp(&doc_created_ms(a)));
    action_ok(rows)
}

pub fn update_ticket(
    app: &AppState,
    session: &SessionState,
    ticket_id: &str,
    data: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, HELP_DESK_TICKETS, ticket_id) {
        Ok(v) => v,
        Err(_) => return action_err("Ticket not found"),
    };
    if !org_id_matches(&current, &org_id) {
        return action_err("Ticket not found");
    }
    let mut patch = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid ticket patch"),
    };
    patch.remove("_id");
    patch.remove("orgId");
    patch.remove("createdAt");
    patch.insert("updatedAt".into(), json!(iso_now()));
    match update_doc_by_id(app, HELP_DESK_TICKETS, ticket_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(Value::Null),
        Err(e) => action_err(e),
    }
}

pub fn add_message_to_ticket(
    app: &AppState,
    session: &SessionState,
    ticket_id: &str,
    message: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, HELP_DESK_TICKETS, ticket_id) {
        Ok(v) => v,
        Err(_) => return action_err("Ticket not found"),
    };
    if !org_id_matches(&current, &org_id) {
        return action_err("Ticket not found");
    }
    let mut messages = current
        .get("messages")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    messages.push(message);
    let mut patch = Map::new();
    patch.insert("messages".into(), Value::Array(messages));
    patch.insert("updatedAt".into(), json!(iso_now()));
    match update_doc_by_id(app, HELP_DESK_TICKETS, ticket_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(Value::Null),
        Err(e) => action_err(e),
    }
}

pub fn assign_ticket(
    app: &AppState,
    session: &SessionState,
    ticket_id: &str,
    user_id: &str,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, HELP_DESK_TICKETS, ticket_id) {
        Ok(v) => v,
        Err(_) => return action_err("Ticket not found"),
    };
    if !org_id_matches(&current, &org_id) {
        return action_err("Ticket not found");
    }
    let mut patch = Map::new();
    patch.insert("assignedTo".into(), json!(user_id));
    patch.insert("updatedAt".into(), json!(iso_now()));
    match update_doc_by_id(app, HELP_DESK_TICKETS, ticket_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(Value::Null),
        Err(e) => action_err(e),
    }
}

pub fn delete_ticket(app: &AppState, session: &SessionState, ticket_id: &str) -> ActionResult<bool> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, HELP_DESK_TICKETS, ticket_id) {
        Ok(v) => v,
        Err(_) => return action_err("Ticket not found"),
    };
    if !org_id_matches(&current, &org_id) {
        return action_err("Ticket not found");
    }
    match delete_doc_by_id(app, HELP_DESK_TICKETS, ticket_id) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}

fn all_tickets(app: &AppState) -> Vec<Value> {
    crate::db::store::read_collection(&app.db_dir(), crate::db::DB_NAME, HELP_DESK_TICKETS).unwrap_or_default()
}
