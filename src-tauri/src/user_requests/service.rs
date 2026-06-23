use serde_json::{json, Value};

use crate::admin::access::{org_id_matches, session_org, value_as_id};
use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::state::AppState;
use crate::store_util::{action_err, action_ok, delete_doc_by_id, get_doc, insert_org_doc, iso_now, read_org_docs, update_doc_by_id};

const USER_REQUESTS: &str = "user_requests";

pub fn create_user_request(app: &AppState, session: &SessionState, data: Value) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut payload = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid user request payload"),
    };
    payload.remove("_id");
    payload.remove("requestId");
    payload.insert("orgId".into(), json!(org_id.clone()));
    payload.insert("createdAt".into(), json!(iso_now()));
    match insert_org_doc(app, USER_REQUESTS, &org_id, payload) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}

pub fn get_user_request(app: &AppState, session: &SessionState, request_id: &str) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, USER_REQUESTS, request_id) {
        Ok(v) => v,
        Err(_) => return action_ok(Value::Null),
    };
    if !org_id_matches(&current, &org_id) {
        return action_ok(Value::Null);
    }
    action_ok(current)
}

pub fn get_user_requests_by_org(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, USER_REQUESTS, org_id).unwrap_or_default();
    rows.sort_by(|a, b| {
        let at = a.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
        let bt = b.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
        bt.cmp(at)
    });
    action_ok(rows)
}

pub fn get_user_requests_for_current_org(
    app: &AppState,
    session: &SessionState,
    limit: usize,
) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, USER_REQUESTS, &org_id).unwrap_or_default();
    rows.sort_by(|a, b| {
        let at = a.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
        let bt = b.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
        bt.cmp(at)
    });
    rows.truncate(limit);
    action_ok(rows)
}

pub fn get_user_requests_by_user(
    app: &AppState,
    session: &SessionState,
    user_id: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = all_requests(app)
        .into_iter()
        .filter(|row| {
            row.get("userId")
                .and_then(value_as_id)
                .as_deref()
                == Some(user_id)
                || row.get("userId").and_then(|v| v.as_str()) == Some(user_id)
        })
        .collect::<Vec<_>>();
    rows.sort_by(|a, b| {
        let at = a.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
        let bt = b.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
        bt.cmp(at)
    });
    action_ok(rows)
}

pub fn get_user_requests_by_status(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
    status: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, USER_REQUESTS, org_id)
        .unwrap_or_default()
        .into_iter()
        .filter(|row| row.get("status").and_then(|v| v.as_str()) == Some(status))
        .collect::<Vec<_>>();
    rows.sort_by(|a, b| {
        let at = a.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
        let bt = b.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
        bt.cmp(at)
    });
    action_ok(rows)
}

pub fn update_user_request(
    app: &AppState,
    session: &SessionState,
    request_id: &str,
    data: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, USER_REQUESTS, request_id) {
        Ok(v) => v,
        Err(_) => return action_err("User request not found"),
    };
    if !org_id_matches(&current, &org_id) {
        return action_err("User request not found");
    }
    let mut patch = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid user request patch"),
    };
    patch.remove("_id");
    patch.remove("orgId");
    patch.remove("createdAt");
    if patch
        .get("status")
        .and_then(|v| v.as_str())
        .map(|v| v.eq_ignore_ascii_case("Completed"))
        .unwrap_or(false)
        && !patch.contains_key("completedAt")
    {
        patch.insert("completedAt".into(), json!(iso_now()));
    }
    match update_doc_by_id(app, USER_REQUESTS, request_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(Value::Null),
        Err(e) => action_err(e),
    }
}

pub fn delete_user_request(app: &AppState, session: &SessionState, request_id: &str) -> ActionResult<bool> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, USER_REQUESTS, request_id) {
        Ok(v) => v,
        Err(_) => return action_err("User request not found"),
    };
    if !org_id_matches(&current, &org_id) {
        return action_err("User request not found");
    }
    match delete_doc_by_id(app, USER_REQUESTS, request_id) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}

fn all_requests(app: &AppState) -> Vec<Value> {
    crate::db::store::read_collection(&app.db_dir(), crate::db::DB_NAME, USER_REQUESTS).unwrap_or_default()
}
