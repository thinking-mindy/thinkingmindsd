use serde_json::{json, Map, Value};

use crate::admin::access::{find_doc_index, org_id_matches, session_org, value_as_id};
use crate::auth::models::make_object_id;
use crate::auth::session::SessionState;
use crate::state::AppState;
use crate::store_util::{
    action_err, action_ok, delete_doc_by_id, doc_created_ms, get_doc, insert_org_doc, iso_now,
    read_org_docs, update_doc_by_id,
};
use crate::admin::service::ActionResult;

const COLLECTION: &str = "purchase_orders";

pub fn create_purchase_order(
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
        None => return action_err("Invalid purchase order payload"),
    };
    payload.insert("createdAt".into(), json!(iso_now()));
    payload.insert("updatedAt".into(), json!(iso_now()));

    let mut inserted = match insert_org_doc(app, COLLECTION, &org_id, payload) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let inserted_id = inserted
        .get("_id")
        .and_then(value_as_id)
        .unwrap_or_else(make_object_id);

    let mut patch = Map::new();
    patch.insert("poNumber".into(), json!(inserted_id));
    if let Ok(Some(updated)) = update_doc_by_id(app, COLLECTION, &inserted_id, patch) {
        inserted = updated;
    }
    action_ok(inserted)
}

pub fn get_purchase_order(
    app: &AppState,
    session: &SessionState,
    po_number: &str,
) -> ActionResult<Value> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    match get_doc(app, COLLECTION, po_number) {
        Ok(v) => action_ok(v),
        Err(_) => action_ok(Value::Null),
    }
}

pub fn get_purchase_orders_by_org(
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
    rows.sort_by(|a, b| doc_created_ms(b).cmp(&doc_created_ms(a)));
    action_ok(rows)
}

pub fn get_purchase_orders_for_current_org(
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
    rows.sort_by(|a, b| doc_created_ms(b).cmp(&doc_created_ms(a)));
    rows.truncate(limit);
    action_ok(rows)
}

pub fn get_purchase_orders_by_status(
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
    rows.sort_by(|a, b| doc_created_ms(b).cmp(&doc_created_ms(a)));
    action_ok(rows)
}

pub fn get_purchase_orders_by_vendor(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
    vendor: &str,
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
    .filter(|doc| doc.get("vendor").and_then(|v| v.as_str()) == Some(vendor))
    .collect();
    rows.sort_by(|a, b| doc_created_ms(b).cmp(&doc_created_ms(a)));
    action_ok(rows)
}

pub fn update_purchase_order(
    app: &AppState,
    session: &SessionState,
    po_number: &str,
    data: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let existing = match get_doc(app, COLLECTION, po_number) {
        Ok(v) => v,
        Err(_) => return action_err("Purchase order not found"),
    };
    if !org_id_matches(&existing, &org_id) {
        return action_err("Purchase order not found");
    }
    let mut patch = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid update payload"),
    };
    patch.remove("_id");
    patch.remove("orgId");
    patch.insert("updatedAt".into(), json!(iso_now()));
    match update_doc_by_id(app, COLLECTION, po_number, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(Value::Null),
        Err(e) => action_err(e),
    }
}

pub fn approve_purchase_order(
    app: &AppState,
    session: &SessionState,
    po_number: &str,
    approved_by: &str,
) -> ActionResult<Value> {
    let mut patch = Map::new();
    patch.insert("status".into(), json!("approved"));
    patch.insert("approvedBy".into(), json!(approved_by));
    patch.insert("updatedAt".into(), json!(iso_now()));
    update_purchase_order(app, session, po_number, Value::Object(patch))
}

pub fn delete_purchase_order(
    app: &AppState,
    session: &SessionState,
    po_number: &str,
) -> ActionResult<bool> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let docs = match read_org_docs(app, COLLECTION, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    if find_doc_index(&docs, po_number).is_none() {
        return action_err("Purchase order not found");
    }
    match delete_doc_by_id(app, COLLECTION, po_number) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}
