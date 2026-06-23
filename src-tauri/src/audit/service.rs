use serde_json::{json, Value};

use crate::admin::access::{org_id_matches, session_org, value_as_id};
use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::state::AppState;
use crate::store_util::{
    action_err, action_ok, delete_doc_by_id, get_doc, in_date_range, insert_org_doc, iso_now, read_org_docs,
};

const AUDIT_LOGS: &str = "audit_logs";

pub fn create_audit_log(app: &AppState, session: &SessionState, data: Value) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut payload = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid audit log payload"),
    };
    payload.remove("_id");
    payload.insert("orgId".into(), json!(org_id.clone()));
    payload.insert("timestamp".into(), json!(iso_now()));
    match insert_org_doc(app, AUDIT_LOGS, &org_id, payload) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}

pub fn get_audit_log(app: &AppState, session: &SessionState, log_id: &str) -> ActionResult<Value> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    match get_doc(app, AUDIT_LOGS, log_id) {
        Ok(v) => action_ok(v),
        Err(_) => action_ok(Value::Null),
    }
}

pub fn get_audit_logs_by_org(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
    limit: usize,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, AUDIT_LOGS, org_id).unwrap_or_default();
    rows.sort_by(|a, b| {
        let at = a.get("timestamp").and_then(|v| v.as_str()).unwrap_or("");
        let bt = b.get("timestamp").and_then(|v| v.as_str()).unwrap_or("");
        bt.cmp(at)
    });
    rows.truncate(limit);
    action_ok(rows)
}

pub fn get_audit_logs_by_actor(
    app: &AppState,
    session: &SessionState,
    actor_id: &str,
    limit: usize,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = all_logs(app)
        .into_iter()
        .filter(|row| {
            row.get("actorId")
                .and_then(value_as_id)
                .as_deref()
                == Some(actor_id)
                || row.get("actorId").and_then(|v| v.as_str()) == Some(actor_id)
        })
        .collect::<Vec<_>>();
    rows.sort_by(|a, b| {
        let at = a.get("timestamp").and_then(|v| v.as_str()).unwrap_or("");
        let bt = b.get("timestamp").and_then(|v| v.as_str()).unwrap_or("");
        bt.cmp(at)
    });
    rows.truncate(limit);
    action_ok(rows)
}

pub fn get_audit_logs_by_resource(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
    resource: &str,
    resource_id: Option<&str>,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let rows = read_org_docs(app, AUDIT_LOGS, org_id)
        .unwrap_or_default()
        .into_iter()
        .filter(|row| row.get("resource").and_then(|v| v.as_str()) == Some(resource))
        .filter(|row| match resource_id {
            Some(id) => {
                row.get("resourceId")
                    .and_then(value_as_id)
                    .as_deref()
                    == Some(id)
                    || row.get("resourceId").and_then(|v| v.as_str()) == Some(id)
            }
            None => true,
        })
        .collect::<Vec<_>>();
    action_ok(rows)
}

pub fn get_audit_logs_by_action(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
    action: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let rows = read_org_docs(app, AUDIT_LOGS, org_id)
        .unwrap_or_default()
        .into_iter()
        .filter(|row| row.get("action").and_then(|v| v.as_str()) == Some(action))
        .collect::<Vec<_>>();
    action_ok(rows)
}

pub fn get_audit_logs_by_date_range(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
    start_date_iso: &str,
    end_date_iso: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let rows = read_org_docs(app, AUDIT_LOGS, org_id)
        .unwrap_or_default()
        .into_iter()
        .filter(|row| {
            in_date_range(
                row,
                "timestamp",
                crate::store_util::parse_iso_ms(start_date_iso),
                crate::store_util::parse_iso_ms(end_date_iso),
            )
        })
        .collect::<Vec<_>>();
    action_ok(rows)
}

pub fn delete_old_audit_logs(
    app: &AppState,
    session: &SessionState,
    before_date_iso: &str,
) -> ActionResult<i64> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let before_ms = match crate::store_util::parse_iso_ms(before_date_iso) {
        Some(v) => v,
        None => return action_err("Invalid beforeDate"),
    };

    let mut docs = all_logs(app);
    let before_count = docs.len() as i64;
    docs.retain(|row| {
        !org_id_matches(row, &org_id)
            || !in_date_range(row, "timestamp", None, Some(before_ms - 1))
    });
    let deleted = before_count - docs.len() as i64;
    if let Err(e) =
        crate::db::store::write_collection(&app.db_dir(), crate::db::DB_NAME, AUDIT_LOGS, &docs)
    {
        return action_err(e);
    }
    action_ok(deleted)
}

#[allow(dead_code)]
pub fn delete_audit_log(app: &AppState, session: &SessionState, log_id: &str) -> ActionResult<bool> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, AUDIT_LOGS, log_id) {
        Ok(v) => v,
        Err(_) => return action_err("Audit log not found"),
    };
    if !org_id_matches(&current, &org_id) {
        return action_err("Audit log not found");
    }
    match delete_doc_by_id(app, AUDIT_LOGS, log_id) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}

fn all_logs(app: &AppState) -> Vec<Value> {
    crate::db::store::read_collection(&app.db_dir(), crate::db::DB_NAME, AUDIT_LOGS).unwrap_or_default()
}
