use serde_json::{json, Map, Value};

use crate::admin::access::{
    doc_id, find_doc_by_id, find_doc_index, org_id_matches, session_org, value_as_id,
};
use crate::admin::service::ActionResult;
use crate::auth::models::make_object_id;
use crate::auth::session::SessionState;
use crate::db::{self, store};
use crate::state::AppState;

pub fn create_pos_order(
    app: &AppState,
    session: &SessionState,
    data: Value,
) -> ActionResult<Value> {
    let (user, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let order_id = format!("ORD-{}", now_ms());
    let id = make_object_id();
    let mut order = match data.as_object() {
        Some(obj) => obj.clone(),
        None => return action_err("Invalid order payload"),
    };
    order.insert("_id".into(), json!(id));
    order.insert("orgId".into(), json!(org_id));
    order.insert("orderId".into(), json!(order_id));
    order.insert("status".into(), json!("pending"));
    order.insert("createdAt".into(), json!(iso_now()));
    if !order.contains_key("createdBy") || order.get("createdBy").map(|v| v.is_null()).unwrap_or(true)
    {
        order.insert("createdBy".into(), json!(user.id));
    }

    let mut docs = store::read_collection(&app.db_dir(), db::DB_NAME, "pos_orders")
        .map_err(|e| e.to_string())
        .unwrap_or_default();
    docs.push(Value::Object(order.clone()));
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, "pos_orders", &docs) {
        return action_err(e);
    }
    action_ok(Value::Object(order))
}

pub fn complete_pos_order(
    app: &AppState,
    session: &SessionState,
    order_id: &str,
    method: &str,
    reference: Option<&str>,
) -> ActionResult<Value> {
    let (user, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let mut orders = match store::read_collection(&app.db_dir(), db::DB_NAME, "pos_orders") {
        Ok(d) => d,
        Err(e) => return action_err(e),
    };
    let idx = match find_doc_index(&orders, order_id) {
        Some(i) => i,
        None => return action_err("Order not found"),
    };
    if !org_id_matches(&orders[idx], &org_id) {
        return action_err("Order not found");
    }

    if orders[idx]
        .get("status")
        .and_then(|v| v.as_str())
        .map(|s| s == "completed")
        .unwrap_or(false)
    {
        return action_ok(orders[idx].clone());
    }

    let order = orders[idx].clone();
    let order_ref = order
        .get("orderId")
        .and_then(|v| v.as_str())
        .map(str::to_string)
        .unwrap_or_else(|| order_id.to_string());
    if let Some(items) = order.get("items").and_then(|v| v.as_array()) {
        if let Err(e) = decrement_inventory_for_order(app, &org_id, &user.id, &order_ref, items) {
            return action_err(e);
        }
    }

    let normalized = if method == "paynow" { "ecocash" } else { method };
    if let Some(obj) = orders[idx].as_object_mut() {
        obj.insert("status".into(), json!("completed"));
        obj.insert("paymentMethod".into(), json!(normalized));
        if let Some(r) = reference {
            obj.insert("paymentReference".into(), json!(r));
        }
        obj.insert("completedAt".into(), json!(iso_now()));
    }

    let updated = orders[idx].clone();
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, "pos_orders", &orders) {
        return action_err(e);
    }
    let order_id_str = crate::admin::access::doc_id(&updated).unwrap_or_else(|| order_id.to_string());
    let total = updated.get("total").and_then(|v| v.as_f64()).unwrap_or(0.0);
    crate::accounting::service::try_post_pos(app, &org_id, &order_id_str, total);
    action_ok(updated)
}

pub fn get_pos_orders(
    app: &AppState,
    session: &SessionState,
    limit: usize,
) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let orders = match store::read_collection(&app.db_dir(), db::DB_NAME, "pos_orders") {
        Ok(d) => d,
        Err(e) => return action_err(e),
    };
    let mut filtered: Vec<Value> = orders
        .into_iter()
        .filter(|d| org_id_matches(d, &org_id))
        .collect();
    filtered.sort_by(|a, b| compare_created_desc(a, b));
    filtered.truncate(limit);
    action_ok(filtered)
}

pub fn get_pos_register_activity(
    app: &AppState,
    session: &SessionState,
    limit: usize,
) -> ActionResult<Vec<Value>> {
    let mut result = get_pos_orders(app, session, limit);
    if !result.success {
        return result;
    }
    let orders = result.data.take().unwrap_or_default();
    let users = store::read_collection(&app.db_dir(), db::DB_NAME, "users").unwrap_or_default();
    let enriched: Vec<Value> = orders
        .into_iter()
        .map(|mut order| {
            if let Some(obj) = order.as_object_mut() {
                if let Some(id) = obj.get("createdBy").and_then(value_as_id) {
                    if let Some(name) = user_display_name(&users, &id) {
                        obj.insert("createdByName".into(), json!(name));
                    }
                }
                if let Some(id) = obj.get("completedBy").and_then(value_as_id) {
                    if let Some(name) = user_display_name(&users, &id) {
                        obj.insert("completedByName".into(), json!(name));
                    }
                }
            }
            order
        })
        .collect();
    action_ok(enriched)
}

pub fn get_menu_categories(app: &AppState, session: &SessionState) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let cats = match store::read_collection(&app.db_dir(), db::DB_NAME, "menu_categories") {
        Ok(d) => d,
        Err(e) => return action_err(e),
    };
    let mut filtered: Vec<Value> = cats
        .into_iter()
        .filter(|d| org_id_matches(d, &org_id))
        .collect();
    filtered.sort_by(|a, b| {
        let da = a.get("displayOrder").and_then(|v| v.as_i64()).unwrap_or(0);
        let db = b.get("displayOrder").and_then(|v| v.as_i64()).unwrap_or(0);
        da.cmp(&db)
    });
    action_ok(filtered)
}

pub fn get_menu_items(
    app: &AppState,
    session: &SessionState,
    category_id: Option<&str>,
    include_unavailable: bool,
) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let items = match store::read_collection(&app.db_dir(), db::DB_NAME, "menu_items") {
        Ok(d) => d,
        Err(e) => return action_err(e),
    };
    let mut filtered: Vec<Value> = items
        .into_iter()
        .filter(|d| {
            if !org_id_matches(d, &org_id) {
                return false;
            }
            if !include_unavailable {
                if let Some(av) = d.get("isAvailable").and_then(|v| v.as_bool()) {
                    if !av {
                        return false;
                    }
                }
            }
            if let Some(cat) = category_id {
                let doc_cat = d
                    .get("categoryId")
                    .and_then(value_as_id)
                    .unwrap_or_default();
                if doc_cat != cat {
                    return false;
                }
            }
            true
        })
        .collect();
    filtered.sort_by(compare_created_asc);
    action_ok(filtered)
}

pub fn sync_inventory_item_to_pos(
    app: &AppState,
    session: &SessionState,
    inventory_item_id: &str,
    category_id: &str,
    options: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let items = match store::read_collection(&app.db_dir(), db::DB_NAME, "inventory_items") {
        Ok(d) => d,
        Err(e) => return action_err(e),
    };
    let inv = match find_doc_by_id(&items, inventory_item_id) {
        Some(d) if org_id_matches(d, &org_id) => d.clone(),
        _ => return action_err("Inventory item not found"),
    };

    let menu_items = store::read_collection(&app.db_dir(), db::DB_NAME, "menu_items")
        .unwrap_or_default();
    let inv_name = inv.get("name").and_then(|v| v.as_str()).unwrap_or("");
    if menu_items.iter().any(|m| {
        org_id_matches(m, &org_id) && m.get("name").and_then(|v| v.as_str()) == Some(inv_name)
    }) {
        return action_err("Menu item already exists for this inventory item");
    }

    let qty = inv.get("quantity").and_then(|v| v.as_f64()).unwrap_or(0.0) as i64;
    let price = inv.get("price").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let description = options
        .get("description")
        .and_then(|v| v.as_str())
        .map(str::to_string)
        .unwrap_or_else(|| format!("Available in stock: {qty}"));
    let image_url = options.get("imageUrl").cloned();

    let id = make_object_id();
    let now = iso_now();
    let mut menu_item = Map::new();
    menu_item.insert("_id".into(), json!(id));
    menu_item.insert("orgId".into(), json!(org_id));
    menu_item.insert("categoryId".into(), json!(category_id));
    menu_item.insert("name".into(), json!(inv_name));
    menu_item.insert("description".into(), json!(description));
    menu_item.insert("price".into(), json!(price));
    if let Some(url) = image_url {
        menu_item.insert("imageUrl".into(), url);
    }
    if let Some(sku) = inv.get("sku") {
        menu_item.insert("sku".into(), sku.clone());
    }
    menu_item.insert("isAvailable".into(), json!(qty > 0));
    menu_item.insert("createdAt".into(), json!(now));
    menu_item.insert("updatedAt".into(), json!(now));

    let mut all_menu = menu_items;
    all_menu.push(Value::Object(menu_item.clone()));
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, "menu_items", &all_menu) {
        return action_err(e);
    }
    action_ok(Value::Object(menu_item))
}

pub fn get_inventory_items_for_pos(app: &AppState, session: &SessionState) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let inventory = match store::read_collection(&app.db_dir(), db::DB_NAME, "inventory_items") {
        Ok(d) => d,
        Err(e) => return action_err(e),
    };
    let menu_items = store::read_collection(&app.db_dir(), db::DB_NAME, "menu_items")
        .unwrap_or_default();
    let synced: std::collections::HashSet<String> = menu_items
        .iter()
        .filter(|m| org_id_matches(m, &org_id))
        .filter_map(|m| m.get("name").and_then(|v| v.as_str()).map(str::to_string))
        .collect();

    let available: Vec<Value> = inventory
        .into_iter()
        .filter(|d| org_id_matches(d, &org_id))
        .filter(|d| {
            d.get("name")
                .and_then(|v| v.as_str())
                .map(|n| !synced.contains(n))
                .unwrap_or(true)
        })
        .collect();
    action_ok(available)
}

fn decrement_inventory_for_order(
    app: &AppState,
    org_id: &str,
    created_by: &str,
    order_ref: &str,
    items: &[Value],
) -> Result<(), String> {
    let mut inventory = store::read_collection(&app.db_dir(), db::DB_NAME, "inventory_items")?;
    let mut movements = store::read_collection(&app.db_dir(), db::DB_NAME, "stock_movements")
        .unwrap_or_default();
    let now = iso_now();

    for order_item in items {
        let item_id = order_item
            .get("itemId")
            .or_else(|| order_item.get("inventoryItemId"))
            .and_then(value_as_id);
        let sku = order_item
            .get("sku")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty());
        let name = order_item
            .get("name")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .unwrap_or("");
        let qty = quantity_from_value(order_item.get("quantity"));
        if qty <= 0 {
            continue;
        }

        let inv_idx = inventory.iter().position(|inv| {
            inventory_line_matches(inv, org_id, item_id.as_deref(), sku, name)
        });

        let idx = match inv_idx {
            Some(i) => i,
            None => {
                let label = if !name.is_empty() {
                    name.to_string()
                } else if let Some(ref id) = item_id {
                    id.clone()
                } else {
                    "unknown item".to_string()
                };
                return Err(format!("Inventory item not found for POS sale: {label}"));
            }
        };

        let previous = quantity_from_value(inventory[idx].get("quantity"));
        let new_qty = (previous - qty).max(0);
        if let Some(obj) = inventory[idx].as_object_mut() {
            obj.insert("quantity".into(), json!(new_qty));
            obj.insert("updatedAt".into(), json!(now));
        }

        let inv = &inventory[idx];
        let movement_id = make_object_id();
        let mut movement = Map::new();
        movement.insert("_id".into(), json!(movement_id));
        movement.insert("orgId".into(), json!(org_id));
        movement.insert(
            "itemId".into(),
            json!(doc_id(inv).unwrap_or_else(|| item_id.clone().unwrap_or_default())),
        );
        movement.insert(
            "itemName".into(),
            inv.get("name").cloned().unwrap_or(json!(name)),
        );
        if let Some(sku_val) = inv.get("sku") {
            movement.insert("itemSku".into(), sku_val.clone());
        } else if let Some(sku) = sku {
            movement.insert("itemSku".into(), json!(sku));
        }
        movement.insert("type".into(), json!("OUT"));
        movement.insert("quantity".into(), json!(qty));
        movement.insert("previousQuantity".into(), json!(previous));
        movement.insert("newQuantity".into(), json!(new_qty));
        movement.insert("reason".into(), json!("POS sale"));
        movement.insert("reference".into(), json!(order_ref));
        movement.insert("createdBy".into(), json!(created_by));
        movement.insert("createdAt".into(), json!(now));
        movements.push(Value::Object(movement));
    }

    store::write_collection(&app.db_dir(), db::DB_NAME, "inventory_items", &inventory)?;
    store::write_collection(&app.db_dir(), db::DB_NAME, "stock_movements", &movements)?;
    Ok(())
}

fn quantity_from_value(value: Option<&Value>) -> i64 {
    match value {
        Some(v) if v.is_i64() => v.as_i64().unwrap_or(0),
        Some(v) if v.is_u64() => v.as_u64().unwrap_or(0) as i64,
        Some(v) if v.is_f64() => v.as_f64().unwrap_or(0.0) as i64,
        Some(v) if v.is_string() => v
            .as_str()
            .and_then(|s| s.trim().parse::<f64>().ok())
            .map(|n| n as i64)
            .unwrap_or(0),
        _ => 0,
    }
}

fn inventory_line_matches(
    inv: &Value,
    org_id: &str,
    item_id: Option<&str>,
    sku: Option<&str>,
    name: &str,
) -> bool {
    if !org_id_matches(inv, org_id) {
        return false;
    }
    if let Some(id) = item_id.filter(|s| !s.is_empty()) {
        if doc_id(inv).as_deref() == Some(id) {
            return true;
        }
    }
    if let Some(sku) = sku {
        if inv.get("sku").and_then(|v| v.as_str()) == Some(sku) {
            return true;
        }
    }
    if !name.is_empty() {
        let inv_name = inv.get("name").and_then(|v| v.as_str()).unwrap_or("");
        if inv_name.eq_ignore_ascii_case(name) {
            return true;
        }
    }
    false
}

fn user_display_name(users: &[Value], user_ref: &str) -> Option<String> {
    let doc = users.iter().find(|u| {
        u.get("clerkId").and_then(|v| v.as_str()) == Some(user_ref)
            || u.get("id").and_then(|v| v.as_str()) == Some(user_ref)
            || doc_id(u).as_deref() == Some(user_ref)
    })?;
    for key in ["public_metadata", "publicMetadata", "metadata"] {
        if let Some(meta) = doc.get(key).and_then(|v| v.as_object()) {
            if let Some(full) = meta.get("fullName").and_then(|v| v.as_str()) {
                if !full.is_empty() {
                    return Some(full.to_string());
                }
            }
            let first = meta.get("firstName").and_then(|v| v.as_str()).unwrap_or("");
            let last = meta.get("lastName").and_then(|v| v.as_str()).unwrap_or("");
            let joined = format!("{first} {last}").trim().to_string();
            if !joined.is_empty() {
                return Some(joined);
            }
        }
    }
    doc.get("email").and_then(|v| v.as_str()).map(str::to_string)
}

fn compare_created_desc(a: &Value, b: &Value) -> std::cmp::Ordering {
    let ta = a.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
    let tb = b.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
    tb.cmp(ta)
}

fn compare_created_asc(a: &Value, b: &Value) -> std::cmp::Ordering {
    let ta = a.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
    let tb = b.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
    ta.cmp(tb)
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
