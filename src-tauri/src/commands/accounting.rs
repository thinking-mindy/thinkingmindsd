use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use crate::accounting::service::{
    backfill, get_chart_of_accounts, get_journal_entries, get_settings, get_statements,
    get_trial_balance, reconcile, update_settings,
};
use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::state::AppState;

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DateRangeInput {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[tauri::command]
pub fn accounting_get_settings_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
) -> ActionResult<Value> {
    get_settings(&app, &session, org_id.as_deref())
}

#[tauri::command]
pub fn accounting_update_settings_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
    patch: Value,
) -> ActionResult<bool> {
    update_settings(&app, &session, &org_id, patch)
}

#[tauri::command]
pub fn accounting_get_chart_of_accounts_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
) -> ActionResult<Vec<Value>> {
    get_chart_of_accounts(&app, &session, org_id.as_deref())
}

#[tauri::command]
pub fn accounting_get_journal_entries_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
    limit: Option<usize>,
) -> ActionResult<Vec<Value>> {
    get_journal_entries(&app, &session, org_id.as_deref(), limit.unwrap_or(100))
}

#[tauri::command]
pub fn accounting_get_trial_balance_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
) -> ActionResult<Vec<Value>> {
    get_trial_balance(&app, &session, org_id.as_deref())
}

#[tauri::command]
pub fn accounting_get_statements_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
    _range: Option<DateRangeInput>,
) -> ActionResult<Value> {
    get_statements(&app, &session, org_id.as_deref())
}

#[tauri::command]
pub fn accounting_backfill_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
) -> ActionResult<Value> {
    backfill(&app, &session, org_id.as_deref())
}

#[tauri::command]
pub fn accounting_reconcile_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
    counted_cash: f64,
    counted_bank: f64,
    notes: Option<String>,
) -> ActionResult<Value> {
    reconcile(
        &app,
        &session,
        &org_id,
        counted_cash,
        counted_bank,
        notes.as_deref(),
    )
}
