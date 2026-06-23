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

const COLLECTION: &str = "contacts";

pub fn create_contact(app: &AppState, session: &SessionState, data: Value) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let mut payload = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid contact payload"),
    };
    payload.insert("createdAt".into(), json!(iso_now()));
    payload.insert("updatedAt".into(), json!(iso_now()));
    if !payload.contains_key("emails") {
        payload.insert("emails".into(), json!([]));
    }
    if !payload.contains_key("phones") {
        payload.insert("phones".into(), json!([]));
    }
    if !payload.contains_key("deals") {
        payload.insert("deals".into(), json!([]));
    }

    let mut inserted = match insert_org_doc(app, COLLECTION, &org_id, payload) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let inserted_id = inserted
        .get("_id")
        .and_then(value_as_id)
        .unwrap_or_else(make_object_id);

    let mut patch = Map::new();
    patch.insert("contactId".into(), json!(inserted_id));
    if let Ok(Some(updated)) = update_doc_by_id(app, COLLECTION, &inserted_id, patch) {
        inserted = updated;
    }
    action_ok(inserted)
}

pub fn get_contact(app: &AppState, session: &SessionState, contact_id: &str) -> ActionResult<Value> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    match get_doc(app, COLLECTION, contact_id) {
        Ok(v) => action_ok(v),
        Err(_) => action_ok(Value::Null),
    }
}

pub fn get_contacts_by_org(
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

pub fn get_contacts_for_current_org(
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

pub fn search_contacts(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
    query: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let q = query.to_ascii_lowercase();
    let rows = match read_org_docs(app, COLLECTION, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let filtered: Vec<Value> = rows
        .into_iter()
        .filter(|row| {
            let name_match = row
                .get("name")
                .and_then(|v| v.as_str())
                .map(|s| s.to_ascii_lowercase().contains(&q))
                .unwrap_or(false);
            let company_match = row
                .get("company")
                .and_then(|v| v.as_str())
                .map(|s| s.to_ascii_lowercase().contains(&q))
                .unwrap_or(false);
            let email_match = row
                .get("emails")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter().any(|email| {
                        email
                            .as_str()
                            .map(|s| s.to_ascii_lowercase().contains(&q))
                            .unwrap_or(false)
                    })
                })
                .unwrap_or(false);
            name_match || company_match || email_match
        })
        .collect();
    action_ok(filtered)
}

pub fn update_contact(
    app: &AppState,
    session: &SessionState,
    contact_id: &str,
    data: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let existing = match get_doc(app, COLLECTION, contact_id) {
        Ok(v) => v,
        Err(_) => return action_err("Contact not found"),
    };
    if !org_id_matches(&existing, &org_id) {
        return action_err("Contact not found");
    }
    let mut patch = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid update payload"),
    };
    patch.remove("_id");
    patch.remove("orgId");
    patch.insert("updatedAt".into(), json!(iso_now()));
    match update_doc_by_id(app, COLLECTION, contact_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(Value::Null),
        Err(e) => action_err(e),
    }
}

pub fn add_deal_to_contact(
    app: &AppState,
    session: &SessionState,
    contact_id: &str,
    deal: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let contact = match get_doc(app, COLLECTION, contact_id) {
        Ok(v) => v,
        Err(_) => return action_err("Contact not found"),
    };
    if !org_id_matches(&contact, &org_id) {
        return action_err("Contact not found");
    }

    let mut deal_obj = match deal.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid deal payload"),
    };
    if !deal_obj.contains_key("dealId") {
        deal_obj.insert("dealId".into(), json!(make_object_id()));
    }

    let mut deals = contact
        .get("deals")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    deals.push(Value::Object(deal_obj));

    let mut patch = Map::new();
    patch.insert("deals".into(), Value::Array(deals));
    patch.insert("updatedAt".into(), json!(iso_now()));
    match update_doc_by_id(app, COLLECTION, contact_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(Value::Null),
        Err(e) => action_err(e),
    }
}

pub fn update_deal_on_contact(
    app: &AppState,
    session: &SessionState,
    contact_id: &str,
    deal_id: &str,
    data: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let contact = match get_doc(app, COLLECTION, contact_id) {
        Ok(v) => v,
        Err(_) => return action_err("Contact not found"),
    };
    if !org_id_matches(&contact, &org_id) {
        return action_err("Contact not found");
    }
    let data_obj = match data.as_object() {
        Some(v) => v,
        None => return action_err("Invalid deal update payload"),
    };

    let deals = contact
        .get("deals")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let mut found = false;
    let next: Vec<Value> = deals
        .into_iter()
        .map(|entry| {
            if let Some(obj) = entry.as_object() {
                let current_id = obj
                    .get("dealId")
                    .and_then(value_as_id)
                    .or_else(|| obj.get("dealId").and_then(|v| v.as_str()).map(str::to_string))
                    .unwrap_or_default();
                if current_id == deal_id {
                    found = true;
                    let mut merged = obj.clone();
                    for (k, v) in data_obj {
                        if k != "dealId" {
                            merged.insert(k.clone(), v.clone());
                        }
                    }
                    return Value::Object(merged);
                }
            }
            entry
        })
        .collect();
    if !found {
        return action_err("Deal not found");
    }

    let mut patch = Map::new();
    patch.insert("deals".into(), Value::Array(next));
    patch.insert("updatedAt".into(), json!(iso_now()));
    match update_doc_by_id(app, COLLECTION, contact_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(Value::Null),
        Err(e) => action_err(e),
    }
}

pub fn delete_deal_from_contact(
    app: &AppState,
    session: &SessionState,
    contact_id: &str,
    deal_id: &str,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let contact = match get_doc(app, COLLECTION, contact_id) {
        Ok(v) => v,
        Err(_) => return action_err("Contact not found"),
    };
    if !org_id_matches(&contact, &org_id) {
        return action_err("Contact not found");
    }

    let deals = contact
        .get("deals")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let before = deals.len();
    let next: Vec<Value> = deals
        .into_iter()
        .filter(|entry| {
            let current_id = entry
                .get("dealId")
                .and_then(value_as_id)
                .or_else(|| entry.get("dealId").and_then(|v| v.as_str()).map(str::to_string))
                .unwrap_or_default();
            current_id != deal_id
        })
        .collect();
    if next.len() == before {
        return action_err("Deal not found");
    }

    let mut patch = Map::new();
    patch.insert("deals".into(), Value::Array(next));
    patch.insert("updatedAt".into(), json!(iso_now()));
    match update_doc_by_id(app, COLLECTION, contact_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(Value::Null),
        Err(e) => action_err(e),
    }
}

pub fn delete_contact(app: &AppState, session: &SessionState, contact_id: &str) -> ActionResult<bool> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let docs = match read_org_docs(app, COLLECTION, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    if find_doc_index(&docs, contact_id).is_none() {
        return action_err("Contact not found");
    }
    match delete_doc_by_id(app, COLLECTION, contact_id) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}
