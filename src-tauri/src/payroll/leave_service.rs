use serde_json::{json, Value};

use crate::admin::access::{find_doc_index, org_id_matches, session_org, value_as_id};
use crate::auth::models::make_object_id;
use crate::auth::session::SessionState;
use crate::state::AppState;
use crate::store_util::{
    action_err, action_ok, delete_doc_by_id, doc_date_ms, get_doc, insert_org_doc, iso_now,
    read_org_docs, update_doc_by_id,
};
use crate::admin::service::ActionResult;

const COLLECTION: &str = "leave_requests";

pub fn create_leave_request(
    app: &AppState,
    session: &SessionState,
    data: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut payload = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid leave request payload"),
    };
    payload.insert("createdAt".into(), json!(iso_now()));
    payload.insert("updatedAt".into(), json!(iso_now()));
    if !payload.contains_key("submittedDate") {
        payload.insert("submittedDate".into(), json!(iso_now()));
    }
    if !payload.contains_key("requestId") {
        payload.insert("requestId".into(), json!(make_object_id()));
    }
    if let Some(val) = payload.get("orgId").cloned() {
        payload.insert("orgId".into(), val);
    } else {
        payload.insert("orgId".into(), json!(org_id));
    }
    match insert_org_doc(app, COLLECTION, &org_id, payload) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}

pub fn get_leave_request(
    app: &AppState,
    session: &SessionState,
    request_id: &str,
) -> ActionResult<Value> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    match get_doc(app, COLLECTION, request_id) {
        Ok(v) => action_ok(v),
        Err(_) => action_ok(Value::Null),
    }
}

pub fn get_leave_requests_by_org(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = match read_org_docs(app, COLLECTION, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    rows.sort_by(|a, b| doc_date_ms(b, "submittedDate").cmp(&doc_date_ms(a, "submittedDate")));
    action_ok(rows)
}

pub fn get_leave_requests_for_current_org(
    app: &AppState,
    session: &SessionState,
    limit: usize,
) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = match read_org_docs(app, COLLECTION, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    rows.sort_by(|a, b| doc_date_ms(b, "submittedDate").cmp(&doc_date_ms(a, "submittedDate")));
    rows.truncate(limit);
    action_ok(rows)
}

pub fn get_leave_requests_by_employee(
    app: &AppState,
    session: &SessionState,
    employee_id: &str,
) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows: Vec<Value> = match read_org_docs(app, COLLECTION, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    }
    .into_iter()
    .filter(|doc| {
        doc.get("employeeId")
            .and_then(value_as_id)
            .map(|id| id == employee_id)
            .unwrap_or(false)
    })
    .collect();
    rows.sort_by(|a, b| doc_date_ms(b, "submittedDate").cmp(&doc_date_ms(a, "submittedDate")));
    action_ok(rows)
}

pub fn get_leave_requests_by_status(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
    status: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows: Vec<Value> = match read_org_docs(app, COLLECTION, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    }
    .into_iter()
    .filter(|doc| doc.get("status").and_then(|v| v.as_str()) == Some(status))
    .collect();
    rows.sort_by(|a, b| doc_date_ms(b, "submittedDate").cmp(&doc_date_ms(a, "submittedDate")));
    action_ok(rows)
}

pub fn update_leave_request(
    app: &AppState,
    session: &SessionState,
    request_id: &str,
    data: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let existing = match get_doc(app, COLLECTION, request_id) {
        Ok(v) => v,
        Err(_) => return action_err("Leave request not found"),
    };
    if !org_id_matches(&existing, &org_id) {
        return action_err("Leave request not found");
    }
    let mut patch = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid update payload"),
    };
    patch.remove("_id");
    patch.remove("orgId");
    patch.insert("updatedAt".into(), json!(iso_now()));
    match update_doc_by_id(app, COLLECTION, request_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(Value::Null),
        Err(e) => action_err(e),
    }
}

pub fn delete_leave_request(
    app: &AppState,
    session: &SessionState,
    request_id: &str,
) -> ActionResult<bool> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let docs = match read_org_docs(app, COLLECTION, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    if find_doc_index(&docs, request_id).is_none() {
        return action_err("Leave request not found");
    }
    match delete_doc_by_id(app, COLLECTION, request_id) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}
