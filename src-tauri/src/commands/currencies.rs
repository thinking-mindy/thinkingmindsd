use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::currencies::service::{
    convert_currency, create_currency, delete_currency, get_all_currencies, get_currency,
    get_currency_by_code, get_usd_exchange_rates, update_currency, update_exchange_rates,
    CurrencyInput,
};
use crate::state::AppState;

#[tauri::command]
pub fn currencies_create_currency_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: CurrencyInput,
) -> ActionResult<Value> {
    create_currency(&app, &session, data)
}

#[tauri::command]
pub fn currencies_get_currency_by_code_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    code: String,
) -> ActionResult<Value> {
    get_currency_by_code(&app, &session, &code)
}

#[tauri::command]
pub fn currencies_get_currency_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    currency_id: String,
) -> ActionResult<Value> {
    get_currency(&app, &session, &currency_id)
}

#[tauri::command]
pub fn currencies_get_all_currencies_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<Vec<Value>> {
    get_all_currencies(&app, &session)
}

#[tauri::command]
pub fn currencies_get_usd_exchange_rates_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<Value> {
    get_usd_exchange_rates(&app, &session)
}

#[tauri::command]
pub fn currencies_update_currency_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    currency_id: String,
    data: Value,
) -> ActionResult<Value> {
    update_currency(&app, &session, &currency_id, data)
}

#[tauri::command]
pub fn currencies_update_exchange_rates_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    rates: Value,
    base: Option<String>,
) -> ActionResult<Value> {
    update_exchange_rates(&app, &session, rates, base)
}

#[tauri::command]
pub fn currencies_convert_currency_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    amount: f64,
    from_code: String,
    to_code: String,
) -> ActionResult<Value> {
    convert_currency(&app, &session, amount, &from_code, &to_code)
}

#[tauri::command]
pub fn currencies_delete_currency_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    currency_id: String,
) -> ActionResult<bool> {
    delete_currency(&app, &session, &currency_id)
}
