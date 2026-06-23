use serde_json::{json, Map, Value};

use crate::admin::access::{doc_id, find_doc_index, org_id_matches, session_org, value_as_id};
use crate::admin::service::ActionResult;
use crate::auth::models::make_object_id;
use crate::auth::session::SessionState;
use crate::db::{self, store};
use crate::state::AppState;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkUpsertResult {
    pub created: usize,
    pub updated: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
}

pub fn create_inventory_item(
    app: &AppState,
    session: &SessionState,
    data: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let id = make_object_id();
    let mut item = match data.as_object() {
        Some(obj) => obj.clone(),
        None => return action_err("Invalid item payload"),
    };
    item.insert("_id".into(), json!(id));
    item.insert("orgId".into(), json!(org_id));

    let mut docs = store::read_collection(&app.db_dir(), db::DB_NAME, "inventory_items")
        .unwrap_or_default();
    docs.push(Value::Object(item.clone()));
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, "inventory_items", &docs) {
        return action_err(e);
    }
    action_ok(Value::Object(item))
}

pub fn get_all_inventory_items(app: &AppState, session: &SessionState) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let items = match store::read_collection(&app.db_dir(), db::DB_NAME, "inventory_items") {
        Ok(d) => d,
        Err(e) => return action_err(e),
    };
    let mut filtered: Vec<Value> = items
        .into_iter()
        .filter(|d| org_id_matches(d, &org_id))
        .collect();
    filtered.sort_by(|a, b| {
        let na = a.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let nb = b.get("name").and_then(|v| v.as_str()).unwrap_or("");
        na.cmp(nb)
    });
    action_ok(filtered)
}

pub fn update_inventory_item(
    app: &AppState,
    session: &SessionState,
    item_id: &str,
    patch: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let mut docs = match store::read_collection(&app.db_dir(), db::DB_NAME, "inventory_items") {
        Ok(d) => d,
        Err(e) => return action_err(e),
    };
    let idx = match find_doc_index(&docs, item_id) {
        Some(i) => i,
        None => return action_err("Inventory item not found"),
    };
    if !org_id_matches(&docs[idx], &org_id) {
        return action_err("Inventory item not found");
    }

    if let (Some(obj), Some(patch_obj)) = (docs[idx].as_object_mut(), patch.as_object()) {
        for (k, v) in patch_obj {
            if k != "_id" && k != "orgId" {
                obj.insert(k.clone(), v.clone());
            }
        }
    }
    let updated = docs[idx].clone();
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, "inventory_items", &docs) {
        return action_err(e);
    }
    action_ok(updated)
}

pub fn delete_inventory_item(
    app: &AppState,
    session: &SessionState,
    item_id: &str,
) -> ActionResult<bool> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let mut docs = match store::read_collection(&app.db_dir(), db::DB_NAME, "inventory_items") {
        Ok(d) => d,
        Err(e) => return action_err(e),
    };
    let before = docs.len();
    docs.retain(|d| {
        doc_id(d).as_deref() != Some(item_id) || !org_id_matches(d, &org_id)
    });
    if docs.len() == before {
        return action_err("Inventory item not found");
    }
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, "inventory_items", &docs) {
        return action_err(e);
    }
    action_ok(true)
}

pub fn bulk_upsert_inventory_items(
    app: &AppState,
    session: &SessionState,
    rows: Vec<Value>,
    update_existing: bool,
) -> ActionResult<BulkUpsertResult> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let mut docs = store::read_collection(&app.db_dir(), db::DB_NAME, "inventory_items")
        .unwrap_or_default();
    let mut created = 0usize;
    let mut updated = 0usize;
    let mut skipped = 0usize;
    let mut errors = Vec::new();

    for row in rows {
        let sku = row.get("sku").and_then(|v| v.as_str()).unwrap_or("").trim();
        let name = row.get("name").and_then(|v| v.as_str()).unwrap_or("").trim();
        if sku.is_empty() || name.is_empty() {
            errors.push(format!("Skipped row missing sku or name: {sku}"));
            skipped += 1;
            continue;
        }

        let existing_idx = docs.iter().position(|d| {
            org_id_matches(d, &org_id) && d.get("sku").and_then(|v| v.as_str()) == Some(sku)
        });

        let mut payload = Map::new();
        payload.insert("orgId".into(), json!(org_id));
        payload.insert("sku".into(), json!(sku));
        payload.insert("name".into(), json!(name));
        if let Some(v) = row.get("quantity") {
            payload.insert("quantity".into(), v.clone());
        } else {
            payload.insert("quantity".into(), json!(0));
        }
        for key in ["location", "reorderLevel", "price"] {
            if let Some(v) = row.get(key) {
                payload.insert(key.into(), v.clone());
            }
        }

        if let Some(idx) = existing_idx {
            if update_existing {
                if let Some(obj) = docs[idx].as_object_mut() {
                    for (k, v) in &payload {
                        obj.insert(k.clone(), v.clone());
                    }
                }
                updated += 1;
            } else {
                skipped += 1;
            }
        } else {
            payload.insert("_id".into(), json!(make_object_id()));
            docs.push(Value::Object(payload));
            created += 1;
        }
    }

    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, "inventory_items", &docs) {
        return action_err(e);
    }
    action_ok(BulkUpsertResult {
        created,
        updated,
        skipped,
        errors,
    })
}

pub fn create_stock_movement(
    app: &AppState,
    session: &SessionState,
    data: Value,
) -> ActionResult<Value> {
    let (user, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let item_id = data
        .get("itemId")
        .and_then(value_as_id)
        .ok_or_else(|| "itemId required".to_string());
    let item_id = match item_id {
        Ok(id) => id,
        Err(e) => return action_err(e),
    };
    let movement_type = data
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let qty = data
        .get("quantity")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0) as i64;

    let mut inventory = match store::read_collection(&app.db_dir(), db::DB_NAME, "inventory_items") {
        Ok(d) => d,
        Err(e) => return action_err(e),
    };
    let inv_idx = inventory.iter().position(|d| {
        doc_id(d).as_deref() == Some(item_id.as_str()) && org_id_matches(d, &org_id)
    });
    let inv_idx = match inv_idx {
        Some(i) => i,
        None => return action_err("Inventory item not found"),
    };

    let previous = inventory[inv_idx]
        .get("quantity")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0) as i64;
    let new_qty = match movement_type {
        "IN" => previous + qty,
        "OUT" => (previous - qty).max(0),
        "ADJUST" => qty,
        _ => return action_err("Invalid movement type"),
    };

    if let Some(obj) = inventory[inv_idx].as_object_mut() {
        obj.insert("quantity".into(), json!(new_qty));
    }
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, "inventory_items", &inventory)
    {
        return action_err(e);
    }

    let inv = &inventory[inv_idx];
    let id = make_object_id();
    let mut movement = Map::new();
    movement.insert("_id".into(), json!(id));
    movement.insert("orgId".into(), json!(org_id));
    movement.insert("itemId".into(), json!(item_id));
    movement.insert(
        "itemName".into(),
        inv.get("name").cloned().unwrap_or(json!("")),
    );
    if let Some(sku) = inv.get("sku") {
        movement.insert("itemSku".into(), sku.clone());
    }
    movement.insert("type".into(), json!(movement_type));
    movement.insert("quantity".into(), json!(qty));
    movement.insert("previousQuantity".into(), json!(previous));
    movement.insert("newQuantity".into(), json!(new_qty));
    for key in ["reason", "reference", "location"] {
        if let Some(v) = data.get(key) {
            movement.insert(key.into(), v.clone());
        }
    }
    movement.insert("createdBy".into(), json!(user.id));
    movement.insert("createdAt".into(), json!(iso_now()));

    let mut movements = store::read_collection(&app.db_dir(), db::DB_NAME, "stock_movements")
        .unwrap_or_default();
    movements.push(Value::Object(movement.clone()));
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, "stock_movements", &movements)
    {
        return action_err(e);
    }
    action_ok(Value::Object(movement))
}

pub fn get_stock_movements(
    app: &AppState,
    session: &SessionState,
    item_id: Option<&str>,
    movement_type: Option<&str>,
    limit: usize,
) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let movements = match store::read_collection(&app.db_dir(), db::DB_NAME, "stock_movements") {
        Ok(d) => d,
        Err(e) => return action_err(e),
    };
    let mut filtered: Vec<Value> = movements
        .into_iter()
        .filter(|d| {
            if !org_id_matches(d, &org_id) {
                return false;
            }
            if let Some(iid) = item_id {
                let doc_item = d.get("itemId").and_then(value_as_id).unwrap_or_default();
                if doc_item != iid {
                    return false;
                }
            }
            if let Some(t) = movement_type {
                if d.get("type").and_then(|v| v.as_str()) != Some(t) {
                    return false;
                }
            }
            true
        })
        .collect();
    filtered.sort_by(|a, b| {
        let ta = a.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
        let tb = b.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
        tb.cmp(ta)
    });
    filtered.truncate(limit);
    action_ok(filtered)
}

pub fn delete_stock_movement(
    app: &AppState,
    session: &SessionState,
    movement_id: &str,
) -> ActionResult<bool> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let mut movements = match store::read_collection(&app.db_dir(), db::DB_NAME, "stock_movements") {
        Ok(d) => d,
        Err(e) => return action_err(e),
    };
    let idx = match find_doc_index(&movements, movement_id) {
        Some(i) => i,
        None => return action_err("Stock movement not found"),
    };
    let movement = movements[idx].clone();
    if !org_id_matches(&movement, &org_id) {
        return action_err("Stock movement not found");
    }

    if let Some(item_id) = movement.get("itemId").and_then(value_as_id) {
        if let Some(prev) = movement.get("previousQuantity").and_then(|v| v.as_f64()) {
            let mut inventory =
                store::read_collection(&app.db_dir(), db::DB_NAME, "inventory_items")
                    .unwrap_or_default();
            if let Some(inv_idx) = inventory.iter().position(|d| doc_id(d).as_deref() == Some(item_id.as_str()))
            {
                if let Some(obj) = inventory[inv_idx].as_object_mut() {
                    obj.insert("quantity".into(), json!(prev as i64));
                }
                let _ = store::write_collection(&app.db_dir(), db::DB_NAME, "inventory_items", &inventory);
            }
        }
    }

    movements.remove(idx);
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, "stock_movements", &movements)
    {
        return action_err(e);
    }
    action_ok(true)
}

pub fn create_supplier(
    app: &AppState,
    session: &SessionState,
    data: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let id = make_object_id();
    let now = iso_now();
    let mut supplier = match data.as_object() {
        Some(obj) => obj.clone(),
        None => return action_err("Invalid supplier payload"),
    };
    supplier.insert("_id".into(), json!(id));
    supplier.insert("orgId".into(), json!(org_id));
    supplier.insert("status".into(), json!("active"));
    supplier.insert("createdAt".into(), json!(now));

    let mut docs = store::read_collection(&app.db_dir(), db::DB_NAME, "suppliers").unwrap_or_default();
    docs.push(Value::Object(supplier.clone()));
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, "suppliers", &docs) {
        return action_err(e);
    }
    action_ok(Value::Object(supplier))
}

pub fn get_all_suppliers(app: &AppState, session: &SessionState) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let suppliers = match store::read_collection(&app.db_dir(), db::DB_NAME, "suppliers") {
        Ok(d) => d,
        Err(e) => return action_err(e),
    };
    let mut filtered: Vec<Value> = suppliers
        .into_iter()
        .filter(|d| org_id_matches(d, &org_id))
        .collect();
    filtered.sort_by(|a, b| {
        let na = a.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let nb = b.get("name").and_then(|v| v.as_str()).unwrap_or("");
        na.cmp(nb)
    });
    action_ok(filtered)
}

pub fn update_supplier(
    app: &AppState,
    session: &SessionState,
    supplier_id: &str,
    patch: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let mut docs = match store::read_collection(&app.db_dir(), db::DB_NAME, "suppliers") {
        Ok(d) => d,
        Err(e) => return action_err(e),
    };
    let idx = match find_doc_index(&docs, supplier_id) {
        Some(i) => i,
        None => return action_err("Supplier not found"),
    };
    if !org_id_matches(&docs[idx], &org_id) {
        return action_err("Supplier not found");
    }

    if let (Some(obj), Some(patch_obj)) = (docs[idx].as_object_mut(), patch.as_object()) {
        for (k, v) in patch_obj {
            if k != "_id" && k != "orgId" && k != "createdAt" {
                obj.insert(k.clone(), v.clone());
            }
        }
        obj.insert("updatedAt".into(), json!(iso_now()));
    }
    let updated = docs[idx].clone();
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, "suppliers", &docs) {
        return action_err(e);
    }
    action_ok(updated)
}

pub fn delete_supplier(
    app: &AppState,
    session: &SessionState,
    supplier_id: &str,
) -> ActionResult<bool> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let mut docs = match store::read_collection(&app.db_dir(), db::DB_NAME, "suppliers") {
        Ok(d) => d,
        Err(e) => return action_err(e),
    };
    let before = docs.len();
    docs.retain(|d| {
        doc_id(d).as_deref() != Some(supplier_id) || !org_id_matches(d, &org_id)
    });
    if docs.len() == before {
        return action_err("Supplier not found");
    }
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, "suppliers", &docs) {
        return action_err(e);
    }
    action_ok(true)
}

pub fn bulk_upsert_suppliers(
    app: &AppState,
    session: &SessionState,
    rows: Vec<Value>,
    update_existing: bool,
) -> ActionResult<BulkUpsertResult> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let mut docs = store::read_collection(&app.db_dir(), db::DB_NAME, "suppliers").unwrap_or_default();
    let mut created = 0usize;
    let mut updated = 0usize;
    let mut skipped = 0usize;
    let mut errors = Vec::new();

    for row in rows {
        let name = row.get("name").and_then(|v| v.as_str()).unwrap_or("").trim();
        if name.is_empty() {
            errors.push("Skipped row missing supplier name".to_string());
            skipped += 1;
            continue;
        }

        let existing_idx = docs.iter().position(|d| {
            org_id_matches(d, &org_id) && d.get("name").and_then(|v| v.as_str()) == Some(name)
        });

        let status = row
            .get("status")
            .and_then(|v| v.as_str())
            .filter(|s| *s == "inactive")
            .unwrap_or("active");

        let mut payload = Map::new();
        payload.insert("orgId".into(), json!(org_id));
        payload.insert("name".into(), json!(name));
        payload.insert("status".into(), json!(status));
        for key in [
            "contactEmail",
            "contactPhone",
            "address",
            "city",
            "state",
            "zipCode",
            "country",
            "website",
            "contactPerson",
            "notes",
        ] {
            if let Some(v) = row.get(key) {
                payload.insert(key.into(), v.clone());
            }
        }

        if let Some(idx) = existing_idx {
            if update_existing {
                let created_at = docs[idx]
                    .get("createdAt")
                    .cloned()
                    .unwrap_or_else(|| json!(iso_now()));
                if let Some(obj) = docs[idx].as_object_mut() {
                    for (k, v) in &payload {
                        obj.insert(k.clone(), v.clone());
                    }
                    obj.insert("createdAt".into(), created_at);
                    obj.insert("updatedAt".into(), json!(iso_now()));
                }
                updated += 1;
            } else {
                skipped += 1;
            }
        } else {
            payload.insert("_id".into(), json!(make_object_id()));
            payload.insert("createdAt".into(), json!(iso_now()));
            payload.insert("updatedAt".into(), json!(iso_now()));
            docs.push(Value::Object(payload));
            created += 1;
        }
    }

    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, "suppliers", &docs) {
        return action_err(e);
    }
    action_ok(BulkUpsertResult {
        created,
        updated,
        skipped,
        errors,
    })
}

fn action_ok<T>(data: T) -> ActionResult<T> {
    ActionResult {
        success: true,
        data: Some(data),
        error: None,
    }
}

fn action_err<T>(msg: impl Into<String>) -> ActionResult<T> {
    ActionResult {
        success: false,
        data: None,
        error: Some(msg.into()),
    }
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn iso_now() -> String {
    let ms = now_ms();
    let secs = ms / 1000;
    let nanos = ((ms % 1000) * 1_000_000) as u32;
    format_rfc3339(secs, nanos)
}

fn format_rfc3339(secs: i64, nanos: u32) -> String {
    let days = secs / 86400;
    let rem = secs % 86400;
    let hours = rem / 3600;
    let minutes = (rem % 3600) / 60;
    let seconds = rem % 60;
    let (year, month, day) = days_to_ymd(days);
    format!(
        "{year:04}-{month:02}-{day:02}T{hours:02}:{minutes:02}:{seconds:02}.{:03}Z",
        nanos / 1_000_000
    )
}

fn days_to_ymd(mut days: i64) -> (i64, i64, i64) {
    let mut year = 1970i64;
    loop {
        let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
        let year_days = if leap { 366 } else { 365 };
        if days < year_days {
            break;
        }
        days -= year_days;
        year += 1;
    }
    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let month_days: [i64; 12] = if leap {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    let mut month = 1i64;
    for &md in &month_days {
        if days < md {
            break;
        }
        days -= md;
        month += 1;
    }
    (year, month, days + 1)
}
