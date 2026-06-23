use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::state::AppState;
use crate::users::service::{get_members, update_user_allowed_modules};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserAllowedModulesInput {
    pub user_id: String,
    pub allowed_modules: Vec<String>,
}

#[tauri::command]
pub fn users_get_members_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> Result<ActionResult<Vec<Value>>, String> {
    get_members(&app, &session)
}

#[tauri::command]
pub fn users_update_allowed_modules_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: UpdateUserAllowedModulesInput,
) -> Result<ActionResult<()>, String> {
    update_user_allowed_modules(&app, &session, input.user_id, input.allowed_modules)
}
