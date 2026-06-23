use serde::Deserialize;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::overrides::service::{
    delete_override_file, ensure_overrides_project, get_override_file, list_override_files,
    resolve_override_or_default, run_company_shell_command, upsert_override_file, EnsureProjectData,
    GetOverrideFileData, ListOverrideFilesData, ResolveOverrideData, ShellCommandData,
};
use crate::state::AppState;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertOverrideFileInput {
    pub path: String,
    pub content: String,
    pub content_type: Option<String>,
}

#[tauri::command]
pub fn overrides_ensure_project_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<EnsureProjectData> {
    ensure_overrides_project(&app, &session)
}

#[tauri::command]
pub fn overrides_list_files_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<ListOverrideFilesData> {
    list_override_files(&app, &session)
}

#[tauri::command]
pub fn overrides_get_file_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    path: String,
) -> ActionResult<GetOverrideFileData> {
    get_override_file(&app, &session, &path)
}

#[tauri::command]
pub fn overrides_upsert_file_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: UpsertOverrideFileInput,
) -> ActionResult<()> {
    upsert_override_file(&app, &session, &input.path, &input.content, input.content_type)
}

#[tauri::command]
pub fn overrides_delete_file_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    path: String,
) -> ActionResult<()> {
    delete_override_file(&app, &session, &path)
}

#[tauri::command]
pub fn overrides_resolve_or_default_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    path: String,
    default_content: String,
) -> ActionResult<ResolveOverrideData> {
    resolve_override_or_default(&app, &session, &path, &default_content)
}

#[tauri::command]
pub fn overrides_run_shell_command_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: String,
) -> ActionResult<ShellCommandData> {
    run_company_shell_command(&app, &session, &input)
}
