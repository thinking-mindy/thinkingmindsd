use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::finance::service::{
    create_budget, create_cashier_transaction, create_expense, create_invoice, create_payment,
    delete_budget, delete_expense, delete_invoice, get_budget_analytics, get_budget_variance,
    get_budgets_by_org, get_cashier_transactions, get_cashier_transactions_filtered,
    get_daily_cash_summary, get_expenses_by_org, get_expenses_by_status, get_finance_monthly_trends,
    get_finance_settings, get_financial_summary, get_invoice, get_invoices_by_org,
    get_payments_by_invoice, get_payments_by_org, update_budget, update_budget_status,
    update_expense, update_finance_settings, update_invoice, update_payment,
};
use crate::state::AppState;

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DateRangeInput {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CashierTransactionFiltersInput {
    pub org_id: Option<String>,
    pub cashier_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub limit: Option<usize>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct BudgetAnalyticsInput {
    pub org_id: Option<String>,
    pub period: Option<String>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct FinancialSummaryInput {
    pub org_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MonthlyTrendsInput {
    pub org_id: Option<String>,
    pub months: Option<usize>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateBudgetStatusInput {
    pub budget_id: String,
    pub status: String,
    pub approved_by: Option<String>,
}

#[tauri::command]
pub fn finance_create_invoice_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_invoice(&app, &session, data)
}

#[tauri::command]
pub fn finance_get_invoice_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    invoice_id: String,
) -> ActionResult<Value> {
    get_invoice(&app, &session, &invoice_id)
}

#[tauri::command]
pub fn finance_get_invoices_by_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
    range: Option<DateRangeInput>,
) -> ActionResult<Vec<Value>> {
    let start_date = range.as_ref().and_then(|r| r.start_date.as_deref());
    let end_date = range.as_ref().and_then(|r| r.end_date.as_deref());
    get_invoices_by_org(&app, &session, org_id.as_deref(), start_date, end_date)
}

#[tauri::command]
pub fn finance_update_invoice_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    invoice_id: String,
    data: Value,
) -> ActionResult<Value> {
    update_invoice(&app, &session, &invoice_id, data)
}

#[tauri::command]
pub fn finance_delete_invoice_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    invoice_id: String,
) -> ActionResult<bool> {
    delete_invoice(&app, &session, &invoice_id)
}

#[tauri::command]
pub fn finance_create_payment_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_payment(&app, &session, data)
}

#[tauri::command]
pub fn finance_get_payments_by_invoice_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    invoice_id: String,
) -> ActionResult<Vec<Value>> {
    get_payments_by_invoice(&app, &session, &invoice_id)
}

#[tauri::command]
pub fn finance_get_payments_by_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
) -> ActionResult<Vec<Value>> {
    get_payments_by_org(&app, &session, org_id.as_deref())
}

#[tauri::command]
pub fn finance_update_payment_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    payment_id: String,
    data: Value,
) -> ActionResult<Value> {
    update_payment(&app, &session, &payment_id, data)
}

#[tauri::command]
pub fn finance_create_expense_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_expense(&app, &session, data)
}

#[tauri::command]
pub fn finance_get_expenses_by_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
    range: Option<DateRangeInput>,
) -> ActionResult<Vec<Value>> {
    let start_date = range.as_ref().and_then(|r| r.start_date.as_deref());
    let end_date = range.as_ref().and_then(|r| r.end_date.as_deref());
    get_expenses_by_org(&app, &session, org_id.as_deref(), start_date, end_date)
}

#[tauri::command]
pub fn finance_get_expenses_by_status_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
    status: String,
) -> ActionResult<Vec<Value>> {
    get_expenses_by_status(&app, &session, org_id.as_deref(), &status)
}

#[tauri::command]
pub fn finance_update_expense_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    expense_id: String,
    data: Value,
) -> ActionResult<Value> {
    update_expense(&app, &session, &expense_id, data)
}

#[tauri::command]
pub fn finance_delete_expense_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    expense_id: String,
) -> ActionResult<bool> {
    delete_expense(&app, &session, &expense_id)
}

#[tauri::command]
pub fn finance_get_finance_settings_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
) -> ActionResult<Value> {
    get_finance_settings(&app, &session, org_id.as_deref())
}

#[tauri::command]
pub fn finance_update_finance_settings_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
    settings: Value,
) -> ActionResult<bool> {
    update_finance_settings(&app, &session, org_id.as_deref(), settings)
}

#[tauri::command]
pub fn finance_create_cashier_transaction_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_cashier_transaction(&app, &session, data)
}

#[tauri::command]
pub fn finance_get_cashier_transactions_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
) -> ActionResult<Vec<Value>> {
    get_cashier_transactions(&app, &session, org_id.as_deref())
}

#[tauri::command]
pub fn finance_get_cashier_transactions_filtered_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    filters: Option<CashierTransactionFiltersInput>,
) -> ActionResult<Vec<Value>> {
    let f = filters.unwrap_or_default();
    get_cashier_transactions_filtered(
        &app,
        &session,
        f.org_id.as_deref(),
        f.cashier_id.as_deref(),
        f.start_date.as_deref(),
        f.end_date.as_deref(),
        f.limit,
    )
}

#[tauri::command]
pub fn finance_get_daily_cash_summary_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
    date: Option<String>,
) -> ActionResult<Value> {
    get_daily_cash_summary(&app, &session, org_id.as_deref(), date.as_deref())
}

#[tauri::command]
pub fn finance_create_budget_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_budget(&app, &session, data)
}

#[tauri::command]
pub fn finance_get_budgets_by_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
) -> ActionResult<Vec<Value>> {
    get_budgets_by_org(&app, &session, org_id.as_deref())
}

#[tauri::command]
pub fn finance_update_budget_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    budget_id: String,
    data: Value,
) -> ActionResult<Value> {
    update_budget(&app, &session, &budget_id, data)
}

#[tauri::command]
pub fn finance_delete_budget_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    budget_id: String,
) -> ActionResult<bool> {
    delete_budget(&app, &session, &budget_id)
}

#[tauri::command]
pub fn finance_update_budget_status_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: UpdateBudgetStatusInput,
) -> ActionResult<Value> {
    update_budget_status(
        &app,
        &session,
        &input.budget_id,
        &input.status,
        input.approved_by.as_deref(),
    )
}

#[tauri::command]
pub fn finance_get_budget_variance_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
) -> ActionResult<Vec<Value>> {
    get_budget_variance(&app, &session, org_id.as_deref())
}

#[tauri::command]
pub fn finance_get_budget_analytics_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: Option<BudgetAnalyticsInput>,
) -> ActionResult<Value> {
    let i = input.unwrap_or_default();
    get_budget_analytics(&app, &session, i.org_id.as_deref(), i.period.as_deref())
}

#[tauri::command]
pub fn finance_get_financial_summary_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: Option<FinancialSummaryInput>,
) -> ActionResult<Value> {
    let i = input.unwrap_or_default();
    get_financial_summary(
        &app,
        &session,
        i.org_id.as_deref(),
        i.start_date.as_deref(),
        i.end_date.as_deref(),
    )
}

#[tauri::command]
pub fn finance_get_finance_monthly_trends_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: Option<MonthlyTrendsInput>,
) -> ActionResult<Vec<Value>> {
    let i = input.unwrap_or_default();
    get_finance_monthly_trends(&app, &session, i.org_id.as_deref(), i.months)
}
