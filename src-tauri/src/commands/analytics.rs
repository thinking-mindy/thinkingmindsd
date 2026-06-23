use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::analytics::service::{
    get_finance_analytics, get_hr_analytics, get_inventory_and_pos_analytics,
    get_marketing_analytics, get_overview_analytics, get_reports_page_data,
};
use crate::auth::session::SessionState;
use crate::state::AppState;

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AnalyticsOrgInput {
    pub org_id: Option<String>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ReportsPageInput {
    pub range: Option<String>,
}

#[tauri::command]
pub fn analytics_get_finance_analytics_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: Option<AnalyticsOrgInput>,
) -> ActionResult<Value> {
    let i = input.unwrap_or_default();
    get_finance_analytics(&app, &session, i.org_id.as_deref())
}

#[tauri::command]
pub fn analytics_get_hr_analytics_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: Option<AnalyticsOrgInput>,
) -> ActionResult<Value> {
    let i = input.unwrap_or_default();
    get_hr_analytics(&app, &session, i.org_id.as_deref())
}

#[tauri::command]
pub fn analytics_get_marketing_analytics_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: Option<AnalyticsOrgInput>,
) -> ActionResult<Value> {
    let i = input.unwrap_or_default();
    get_marketing_analytics(&app, &session, i.org_id.as_deref())
}

#[tauri::command]
pub fn analytics_get_overview_analytics_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: Option<AnalyticsOrgInput>,
) -> ActionResult<Value> {
    let i = input.unwrap_or_default();
    get_overview_analytics(&app, &session, i.org_id.as_deref())
}

#[tauri::command]
pub fn analytics_get_inventory_and_pos_analytics_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: Option<AnalyticsOrgInput>,
) -> ActionResult<Value> {
    let i = input.unwrap_or_default();
    get_inventory_and_pos_analytics(&app, &session, i.org_id.as_deref())
}

#[tauri::command]
pub fn analytics_get_reports_page_data_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: Option<ReportsPageInput>,
) -> ActionResult<Value> {
    let i = input.unwrap_or_default();
    get_reports_page_data(&app, &session, i.range.as_deref())
}
