use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::plans::service::{get_all_plans, get_plan, get_plan_by_slug};
use crate::state::AppState;

#[tauri::command]
pub fn plan_get_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    plan_id: String,
) -> Result<ActionResult<Value>, String> {
    get_plan(&app, &session, &plan_id)
}

#[tauri::command]
pub fn plan_get_by_slug_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    slug: String,
) -> Result<ActionResult<Value>, String> {
    get_plan_by_slug(&app, &session, &slug)
}

#[tauri::command]
pub fn plan_get_all_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> Result<ActionResult<Vec<Value>>, String> {
    get_all_plans(&app, &session)
}
