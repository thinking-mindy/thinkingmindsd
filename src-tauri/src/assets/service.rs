use serde_json::{json, Value};

use crate::admin::access::{find_doc_index, org_id_matches, session_org, value_as_id};
use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::state::AppState;
use crate::store_util::{action_err, action_ok, delete_doc_by_id, get_doc, insert_org_doc, read_org_docs, update_doc_by_id};

const ASSETS: &str = "assets";

pub fn create_asset(app: &AppState, session: &SessionState, data: Value) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut payload = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid asset payload"),
    };
    payload.remove("_id");
    payload.insert("orgId".into(), json!(org_id.clone()));
    match insert_org_doc(app, ASSETS, &org_id, payload) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}

pub fn get_asset(app: &AppState, session: &SessionState, asset_id: &str) -> ActionResult<Value> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    match get_doc(app, ASSETS, asset_id) {
        Ok(v) => action_ok(v),
        Err(_) => action_ok(Value::Null),
    }
}

pub fn get_assets_by_org(app: &AppState, session: &SessionState, org_id: &str) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    action_ok(read_org_docs(app, ASSETS, org_id).unwrap_or_default())
}

pub fn get_assets_for_current_org(app: &AppState, session: &SessionState, limit: usize) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, ASSETS, &org_id).unwrap_or_default();
    rows.truncate(limit);
    action_ok(rows)
}

pub fn get_assets_by_status(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
    status: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let rows = read_org_docs(app, ASSETS, org_id)
        .unwrap_or_default()
        .into_iter()
        .filter(|row| row.get("status").and_then(|v| v.as_str()) == Some(status))
        .collect::<Vec<_>>();
    action_ok(rows)
}

pub fn get_assets_by_user(app: &AppState, session: &SessionState, user_id: &str) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let rows = all_assets(app)
        .into_iter()
        .filter(|row| {
            row.get("assignedToUserId")
                .and_then(value_as_id)
                .as_deref()
                == Some(user_id)
                || row.get("assignedToUserId").and_then(|v| v.as_str()) == Some(user_id)
        })
        .collect::<Vec<_>>();
    action_ok(rows)
}

pub fn get_asset_by_tag(app: &AppState, session: &SessionState, tag: &str, org_id: &str) -> ActionResult<Value> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let rows = read_org_docs(app, ASSETS, org_id).unwrap_or_default();
    let found = rows
        .into_iter()
        .find(|row| row.get("tag").and_then(|v| v.as_str()) == Some(tag));
    action_ok(found.unwrap_or(Value::Null))
}

pub fn update_asset(app: &AppState, session: &SessionState, asset_id: &str, data: Value) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, ASSETS, asset_id) {
        Ok(v) => v,
        Err(_) => return action_err("Asset not found"),
    };
    if !org_id_matches(&current, &org_id) {
        return action_err("Asset not found");
    }
    let mut patch = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid asset patch"),
    };
    patch.remove("_id");
    patch.remove("orgId");
    match update_doc_by_id(app, ASSETS, asset_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(Value::Null),
        Err(e) => action_err(e),
    }
}

pub fn assign_asset_to_user(
    app: &AppState,
    session: &SessionState,
    asset_id: &str,
    user_id: &str,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, ASSETS, asset_id) {
        Ok(v) => v,
        Err(_) => return action_err("Asset not found"),
    };
    if !org_id_matches(&current, &org_id) {
        return action_err("Asset not found");
    }
    let mut patch = serde_json::Map::new();
    patch.insert("assignedToUserId".into(), json!(user_id));
    match update_doc_by_id(app, ASSETS, asset_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(Value::Null),
        Err(e) => action_err(e),
    }
}

pub fn delete_asset(app: &AppState, session: &SessionState, asset_id: &str) -> ActionResult<bool> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, ASSETS, asset_id) {
        Ok(v) => v,
        Err(_) => return action_err("Asset not found"),
    };
    if !org_id_matches(&current, &org_id) {
        return action_err("Asset not found");
    }
    match delete_doc_by_id(app, ASSETS, asset_id) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}

fn all_assets(app: &AppState) -> Vec<Value> {
    crate::db::store::read_collection(&app.db_dir(), crate::db::DB_NAME, ASSETS).unwrap_or_default()
}

#[allow(dead_code)]
fn _exists(rows: &[Value], id: &str) -> bool {
    find_doc_index(rows, id).is_some()
}
