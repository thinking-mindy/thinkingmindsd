use serde_json::{json, Map, Value};

use crate::admin::access::{doc_id, find_doc_by_id, find_doc_index, org_id_matches};
use crate::admin::service::ActionResult;
use crate::auth::models::make_object_id;
use crate::db::{self, store};
use crate::state::AppState;

pub fn action_ok<T: serde::Serialize>(data: T) -> ActionResult<T> {
    ActionResult {
        success: true,
        data: Some(data),
        error: None,
    }
}

pub fn action_err<T: serde::Serialize>(error: impl Into<String>) -> ActionResult<T> {
    ActionResult {
        success: false,
        data: None,
        error: Some(error.into()),
    }
}

pub fn action_err_plain(error: impl Into<String>) -> ActionResult<()> {
    action_err(error)
}

pub fn iso_now() -> String {
    ms_to_iso(now_ms())
}

pub fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Civil day index for 1970-01-01 under `days_from_civil` (proleptic Gregorian).
const UNIX_EPOCH_CIVIL_DAYS: i64 = 719_468;

pub fn parse_iso_ms(value: &str) -> Option<i64> {
    if value.len() < 19 {
        return None;
    }
    let year: i64 = value.get(0..4)?.parse().ok()?;
    let month: i64 = value.get(5..7)?.parse().ok()?;
    let day: i64 = value.get(8..10)?.parse().ok()?;
    let hour: i64 = value.get(11..13)?.parse().ok()?;
    let minute: i64 = value.get(14..16)?.parse().ok()?;
    let second: i64 = value.get(17..19)?.parse().ok()?;
    let days = days_from_civil(year, month, day) - UNIX_EPOCH_CIVIL_DAYS;
    Some((days * 86400 + hour * 3600 + minute * 60 + second) * 1000)
}

pub fn ms_to_iso(ms: i64) -> String {
    let secs = ms / 1000;
    let rem = secs.rem_euclid(86400);
    let hour = rem / 3600;
    let minute = (rem % 3600) / 60;
    let second = rem % 60;
    let days = secs.div_euclid(86400);
    let (year, month, day) = civil_from_days(days);
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}.000Z")
}

fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let y = if month <= 2 { year - 1 } else { year };
    let era = if year >= 0 { y / 400 } else { (y - 399) / 400 };
    let yoe = y - era * 400;
    let doy = (153 * (if month > 2 { month - 3 } else { month + 9 }) + 2) / 5 + day - 1;
    yoe * 365 + yoe / 4 - yoe / 100 + doy + era * 146097
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let era = if days >= 0 { days } else { days - 146096 } / 146097;
    let doe = days - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if month <= 2 { y + 1 } else { y };
    (year, month, day)
}

pub fn read_org_docs(app: &AppState, collection: &str, org_id: &str) -> Result<Vec<Value>, String> {
    let docs = store::read_collection(&app.db_dir(), db::DB_NAME, collection)?;
    Ok(docs
        .into_iter()
        .filter(|d| org_id_matches(d, org_id))
        .collect())
}

pub fn insert_org_doc(
    app: &AppState,
    collection: &str,
    org_id: &str,
    mut doc: Map<String, Value>,
) -> Result<Value, String> {
    let id = make_object_id();
    doc.insert("_id".into(), json!(id));
    doc.insert("orgId".into(), json!(org_id));
    if !doc.contains_key("createdAt") {
        doc.insert("createdAt".into(), json!(iso_now()));
    }
    let value = Value::Object(doc);
    let mut docs = store::read_collection(&app.db_dir(), db::DB_NAME, collection).unwrap_or_default();
    docs.push(value.clone());
    store::write_collection(&app.db_dir(), db::DB_NAME, collection, &docs)?;
    Ok(value)
}

pub fn update_doc_by_id(
    app: &AppState,
    collection: &str,
    doc_id_str: &str,
    patch: Map<String, Value>,
) -> Result<Option<Value>, String> {
    let mut docs = store::read_collection(&app.db_dir(), db::DB_NAME, collection)?;
    let idx = find_doc_index(&docs, doc_id_str).ok_or_else(|| "Document not found".to_string())?;
    if let Some(obj) = docs[idx].as_object_mut() {
        for (k, v) in patch {
            obj.insert(k, v);
        }
        let updated = docs[idx].clone();
        store::write_collection(&app.db_dir(), db::DB_NAME, collection, &docs)?;
        return Ok(Some(updated));
    }
    Err("Invalid document".into())
}

pub fn delete_doc_by_id(app: &AppState, collection: &str, doc_id_str: &str) -> Result<bool, String> {
    let mut docs = store::read_collection(&app.db_dir(), db::DB_NAME, collection)?;
    let before = docs.len();
    docs.retain(|d| doc_id(d).as_deref() != Some(doc_id_str));
    if docs.len() == before {
        return Ok(false);
    }
    store::write_collection(&app.db_dir(), db::DB_NAME, collection, &docs)?;
    Ok(true)
}

pub fn find_org_doc_by_field(
    app: &AppState,
    collection: &str,
    org_id: &str,
    field: &str,
    value: &str,
) -> Result<Option<Value>, String> {
    let docs = read_org_docs(app, collection, org_id)?;
    Ok(docs.into_iter().find(|d| {
        d.get(field)
            .and_then(|v| v.as_str())
            .map(|s| s == value)
            .unwrap_or(false)
            || d.get(field)
                .and_then(|v| doc_id(v))
                .as_deref()
                == Some(value)
    }))
}

pub fn get_doc(app: &AppState, collection: &str, doc_id_str: &str) -> Result<Value, String> {
    let docs = store::read_collection(&app.db_dir(), db::DB_NAME, collection)?;
    find_doc_by_id(&docs, doc_id_str)
        .cloned()
        .ok_or_else(|| "Document not found".to_string())
}

pub fn sum_field(rows: &[Value], field: &str) -> f64 {
    rows.iter()
        .filter_map(|r| r.get(field).and_then(|v| v.as_f64()))
        .sum()
}

pub fn doc_created_ms(doc: &Value) -> i64 {
    doc.get("createdAt")
        .and_then(|v| v.as_str())
        .and_then(parse_iso_ms)
        .unwrap_or(0)
}

pub fn doc_date_ms(doc: &Value, field: &str) -> i64 {
    doc.get(field)
        .and_then(|v| v.as_str())
        .and_then(parse_iso_ms)
        .unwrap_or(0)
}

pub fn in_date_range(doc: &Value, field: &str, start_ms: Option<i64>, end_ms: Option<i64>) -> bool {
    let ms = doc_date_ms(doc, field);
    if ms == 0 {
        return start_ms.is_none() && end_ms.is_none();
    }
    if let Some(s) = start_ms {
        if ms < s {
            return false;
        }
    }
    if let Some(e) = end_ms {
        if ms > e {
            return false;
        }
    }
    true
}
