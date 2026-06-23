use serde::Deserialize;
use serde_json::{json, Value};

use crate::admin::service::ActionResult;
use crate::auth::models::make_object_id;
use crate::auth::session::SessionState;
use crate::db::{self, store};
use crate::state::AppState;
use crate::store_util::{action_err, action_ok, iso_now};

const COLLECTION: &str = "currencies";
const BASE_CODE: &str = "USD";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrencyInput {
    pub code: String,
    pub symbol: String,
    pub decimals: i64,
}

pub fn create_currency(
    app: &AppState,
    _session: &SessionState,
    data: CurrencyInput,
) -> ActionResult<Value> {
    let mut docs = match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let code = data.code.trim().to_ascii_uppercase();
    if code.is_empty() {
        return action_err("Currency code is required");
    }
    let now = iso_now();
    let row = json!({
        "_id": make_object_id(),
        "code": code,
        "symbol": data.symbol,
        "decimals": data.decimals,
        "createdAt": now,
        "updatedAt": now,
    });
    docs.push(row.clone());
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, COLLECTION, &docs) {
        return action_err(e);
    }

    let mut rates = get_usd_rates_map(app);
    if let Some(code_str) = row.get("code").and_then(|v| v.as_str()) {
        rates.entry(code_str.to_string()).or_insert(1.0);
    }
    let _ = set_usd_rates(app, rates, BASE_CODE);

    action_ok(row)
}

pub fn get_currency_by_code(
    app: &AppState,
    _session: &SessionState,
    code: &str,
) -> ActionResult<Value> {
    let docs = match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target = code.to_ascii_uppercase();
    let row = docs
        .into_iter()
        .find(|v| v.get("code").and_then(|x| x.as_str()) == Some(target.as_str()));
    action_ok(row.unwrap_or(Value::Null))
}

pub fn get_currency(app: &AppState, _session: &SessionState, currency_id: &str) -> ActionResult<Value> {
    let docs = match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let row = docs
        .into_iter()
        .find(|v| v.get("_id").and_then(|x| x.as_str()) == Some(currency_id));
    action_ok(row.unwrap_or(Value::Null))
}

pub fn get_all_currencies(app: &AppState, _session: &SessionState) -> ActionResult<Vec<Value>> {
    if let Err(e) = ensure_default_currencies(app) {
        return action_err(e);
    }
    let mut docs = match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    docs.sort_by(|a, b| {
        a.get("code")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .cmp(b.get("code").and_then(|v| v.as_str()).unwrap_or(""))
    });
    action_ok(docs)
}

pub fn get_usd_exchange_rates(app: &AppState, _session: &SessionState) -> ActionResult<Value> {
    if let Err(e) = ensure_default_currencies(app) {
        return action_err(e);
    }
    let docs = match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let usd = docs
        .iter()
        .find(|v| v.get("code").and_then(|x| x.as_str()) == Some(BASE_CODE));
    let rates = usd
        .and_then(|u| u.get("exchangeRates"))
        .and_then(|r| r.get("rates"))
        .cloned()
        .unwrap_or_else(|| default_rate_map());
    let last_updated = usd
        .and_then(|u| u.get("exchangeRates"))
        .and_then(|r| r.get("lastUpdated"))
        .cloned()
        .unwrap_or(Value::Null);
    action_ok(json!({
        "rates": rates,
        "lastUpdated": last_updated,
    }))
}

pub fn update_currency(
    app: &AppState,
    _session: &SessionState,
    currency_id: &str,
    data: Value,
) -> ActionResult<Value> {
    let mut docs = match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let Some(idx) = docs
        .iter()
        .position(|v| v.get("_id").and_then(|x| x.as_str()) == Some(currency_id))
    else {
        return action_ok(Value::Null);
    };

    let patch = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid currency payload"),
    };
    if let Some(obj) = docs[idx].as_object_mut() {
        for (k, v) in patch {
            obj.insert(k, v);
        }
        obj.insert("updatedAt".into(), json!(iso_now()));
    }
    let updated = docs[idx].clone();
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, COLLECTION, &docs) {
        return action_err(e);
    }
    action_ok(updated)
}

pub fn update_exchange_rates(
    app: &AppState,
    _session: &SessionState,
    rates: Value,
    base: Option<String>,
) -> ActionResult<Value> {
    if let Err(e) = ensure_default_currencies(app) {
        return action_err(e);
    }
    let base_code = base
        .unwrap_or_else(|| BASE_CODE.to_string())
        .trim()
        .to_ascii_uppercase();
    let mut normalized = serde_json::Map::new();
    if let Some(obj) = rates.as_object() {
        for (k, v) in obj {
            normalized.insert(k.to_ascii_uppercase(), json!(v.as_f64().unwrap_or(0.0)));
        }
    }
    normalized.insert(base_code.clone(), json!(1.0));
    let rate_map_value = Value::Object(normalized);

    let mut docs = match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let now = iso_now();
    let exchange_rates = json!({
        "base": base_code,
        "rates": rate_map_value,
        "lastUpdated": now,
    });

    if let Some(usd) = docs
        .iter_mut()
        .find(|v| v.get("code").and_then(|x| x.as_str()) == Some(BASE_CODE))
    {
        if let Some(obj) = usd.as_object_mut() {
            obj.insert("exchangeRates".into(), exchange_rates.clone());
            obj.insert("updatedAt".into(), json!(iso_now()));
        }
    } else {
        docs.push(json!({
            "_id": make_object_id(),
            "code": BASE_CODE,
            "symbol": "$",
            "decimals": 2,
            "exchangeRates": exchange_rates.clone(),
            "createdAt": iso_now(),
            "updatedAt": iso_now(),
        }));
    }

    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, COLLECTION, &docs) {
        return action_err(e);
    }
    let updated = docs
        .into_iter()
        .find(|v| v.get("code").and_then(|x| x.as_str()) == Some(BASE_CODE))
        .unwrap_or(Value::Null);
    action_ok(updated)
}

pub fn convert_currency(
    app: &AppState,
    session: &SessionState,
    amount: f64,
    from_code: &str,
    to_code: &str,
) -> ActionResult<Value> {
    let rates_res = get_usd_exchange_rates(app, session);
    if !rates_res.success {
        return action_err(
            rates_res
                .error
                .unwrap_or_else(|| "Exchange rates not available".to_string()),
        );
    }
    let Some(data) = rates_res.data else {
        return action_err("Exchange rates not available");
    };
    let Some(rates_obj) = data.get("rates").and_then(|v| v.as_object()) else {
        return action_err("Exchange rates not available");
    };

    let from = from_code.to_ascii_uppercase();
    let to = to_code.to_ascii_uppercase();
    let from_rate = rates_obj.get(&from).and_then(|v| v.as_f64()).unwrap_or(0.0);
    let to_rate = rates_obj.get(&to).and_then(|v| v.as_f64()).unwrap_or(0.0);
    if from_rate <= 0.0 || to_rate <= 0.0 {
        return action_err("Currency not found in rate table");
    }
    let in_usd = if from == BASE_CODE { amount } else { amount / from_rate };
    let converted = if to == BASE_CODE { in_usd } else { in_usd * to_rate };
    action_ok(json!({
        "amount": converted,
        "from": from,
        "to": to,
    }))
}

pub fn delete_currency(
    app: &AppState,
    _session: &SessionState,
    currency_id: &str,
) -> ActionResult<bool> {
    let mut docs = match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let existing = docs
        .iter()
        .find(|v| v.get("_id").and_then(|x| x.as_str()) == Some(currency_id))
        .cloned();
    let Some(doc) = existing else {
        return action_ok(false);
    };
    if doc.get("code").and_then(|v| v.as_str()) == Some(BASE_CODE) {
        return action_err("Cannot delete base currency (USD)");
    }

    docs.retain(|v| v.get("_id").and_then(|x| x.as_str()) != Some(currency_id));
    let deleted = docs.len()
        < match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION) {
            Ok(v) => v.len(),
            Err(_) => docs.len(),
        };
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, COLLECTION, &docs) {
        return action_err(e);
    }

    if let Some(code) = doc.get("code").and_then(|v| v.as_str()) {
        let mut rates = get_usd_rates_map(app);
        rates.remove(code);
        let _ = set_usd_rates(app, rates, BASE_CODE);
    }

    action_ok(deleted)
}

fn ensure_default_currencies(app: &AppState) -> Result<(), String> {
    let mut docs = store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION)?;
    if !docs.is_empty() {
        return Ok(());
    }
    let now = iso_now();
    docs.push(json!({
        "_id": make_object_id(),
        "code": "USD",
        "symbol": "$",
        "decimals": 2,
        "exchangeRates": {
            "base": BASE_CODE,
            "rates": default_rate_map(),
            "lastUpdated": now,
        },
        "createdAt": now,
        "updatedAt": now,
    }));
    docs.push(json!({
        "_id": make_object_id(),
        "code": "EUR",
        "symbol": "€",
        "decimals": 2,
        "createdAt": now,
        "updatedAt": now,
    }));
    docs.push(json!({
        "_id": make_object_id(),
        "code": "GBP",
        "symbol": "£",
        "decimals": 2,
        "createdAt": now,
        "updatedAt": now,
    }));
    docs.push(json!({
        "_id": make_object_id(),
        "code": "ZAR",
        "symbol": "R",
        "decimals": 2,
        "createdAt": now,
        "updatedAt": now,
    }));
    store::write_collection(&app.db_dir(), db::DB_NAME, COLLECTION, &docs)?;
    Ok(())
}

fn default_rate_map() -> Value {
    json!({
        "USD": 1.0,
        "EUR": 0.92,
        "GBP": 0.79,
        "ZAR": 18.5,
    })
}

fn get_usd_rates_map(app: &AppState) -> std::collections::BTreeMap<String, f64> {
    let docs = store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION).unwrap_or_default();
    let usd = docs
        .into_iter()
        .find(|v| v.get("code").and_then(|x| x.as_str()) == Some(BASE_CODE));
    let mut map = std::collections::BTreeMap::new();
    if let Some(rates) = usd
        .as_ref()
        .and_then(|u| u.get("exchangeRates"))
        .and_then(|e| e.get("rates"))
        .and_then(|r| r.as_object())
    {
        for (k, v) in rates {
            map.insert(k.to_string(), v.as_f64().unwrap_or(0.0));
        }
    }
    if map.is_empty() {
        map.insert("USD".into(), 1.0);
        map.insert("EUR".into(), 0.92);
        map.insert("GBP".into(), 0.79);
        map.insert("ZAR".into(), 18.5);
    }
    map
}

fn set_usd_rates(
    app: &AppState,
    rates: std::collections::BTreeMap<String, f64>,
    base: &str,
) -> Result<(), String> {
    let mut docs = store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION)?;
    let now = iso_now();
    let rates_json: serde_json::Map<String, Value> = rates
        .into_iter()
        .map(|(k, v)| (k, json!(v)))
        .collect();

    if let Some(usd) = docs
        .iter_mut()
        .find(|v| v.get("code").and_then(|x| x.as_str()) == Some(BASE_CODE))
    {
        if let Some(obj) = usd.as_object_mut() {
            obj.insert(
                "exchangeRates".into(),
                json!({
                    "base": base,
                    "rates": rates_json,
                    "lastUpdated": now,
                }),
            );
            obj.insert("updatedAt".into(), json!(iso_now()));
        }
    } else {
        docs.push(json!({
            "_id": make_object_id(),
            "code": BASE_CODE,
            "symbol": "$",
            "decimals": 2,
            "exchangeRates": {
                "base": base,
                "rates": rates_json,
                "lastUpdated": now,
            },
            "createdAt": now,
            "updatedAt": now,
        }));
    }
    store::write_collection(&app.db_dir(), db::DB_NAME, COLLECTION, &docs)
}
