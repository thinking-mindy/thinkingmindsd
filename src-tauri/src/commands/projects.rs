use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::projects::service::{
    add_member_to_project, create_project, create_task, delete_project, delete_task, get_org_members_for_tasks,
    get_project, get_projects_by_org, get_projects_by_status, get_projects_for_current_org, get_task,
    get_tasks_by_assigned, get_tasks_by_org, get_tasks_by_project, get_tasks_by_status, get_tasks_for_current_org,
    get_work_board_config, migrate_project_statuses, migrate_task_statuses, save_work_board_config, update_project,
    update_task,
};
use crate::state::AppState;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectsByStatusInput {
    pub org_id: String,
    pub status: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddMemberToProjectInput {
    pub project_id: String,
    pub user_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TasksByStatusInput {
    pub org_id: String,
    pub status: String,
}

#[tauri::command]
pub fn projects_get_org_members_for_tasks_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<Vec<Value>> {
    get_org_members_for_tasks(&app, &session)
}

#[tauri::command]
pub fn projects_create_project_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_project(&app, &session, data)
}

#[tauri::command]
pub fn projects_get_project_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    project_id: String,
) -> ActionResult<Value> {
    get_project(&app, &session, &project_id)
}

#[tauri::command]
pub fn projects_get_projects_by_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
) -> ActionResult<Vec<Value>> {
    get_projects_by_org(&app, &session, &org_id)
}

#[tauri::command]
pub fn projects_get_projects_for_current_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    limit: Option<usize>,
) -> ActionResult<Vec<Value>> {
    get_projects_for_current_org(&app, &session, limit.unwrap_or(200))
}

#[tauri::command]
pub fn projects_get_projects_by_status_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: ProjectsByStatusInput,
) -> ActionResult<Vec<Value>> {
    get_projects_by_status(&app, &session, &input.org_id, &input.status)
}

#[tauri::command]
pub fn projects_update_project_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    project_id: String,
    data: Value,
) -> ActionResult<Value> {
    update_project(&app, &session, &project_id, data)
}

#[tauri::command]
pub fn projects_add_member_to_project_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: AddMemberToProjectInput,
) -> ActionResult<Value> {
    add_member_to_project(&app, &session, &input.project_id, &input.user_id)
}

#[tauri::command]
pub fn projects_delete_project_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    project_id: String,
) -> ActionResult<bool> {
    delete_project(&app, &session, &project_id)
}

#[tauri::command]
pub fn projects_create_task_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_task(&app, &session, data)
}

#[tauri::command]
pub fn projects_get_task_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    task_id: String,
) -> ActionResult<Value> {
    get_task(&app, &session, &task_id)
}

#[tauri::command]
pub fn projects_get_tasks_by_project_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    project_id: String,
) -> ActionResult<Vec<Value>> {
    get_tasks_by_project(&app, &session, &project_id)
}

#[tauri::command]
pub fn projects_get_tasks_by_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
) -> ActionResult<Vec<Value>> {
    get_tasks_by_org(&app, &session, &org_id)
}

#[tauri::command]
pub fn projects_get_tasks_for_current_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    limit: Option<usize>,
) -> ActionResult<Vec<Value>> {
    get_tasks_for_current_org(&app, &session, limit.unwrap_or(300))
}

#[tauri::command]
pub fn projects_get_tasks_by_assigned_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    user_id: String,
) -> ActionResult<Vec<Value>> {
    get_tasks_by_assigned(&app, &session, &user_id)
}

#[tauri::command]
pub fn projects_get_tasks_by_status_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: TasksByStatusInput,
) -> ActionResult<Vec<Value>> {
    get_tasks_by_status(&app, &session, &input.org_id, &input.status)
}

#[tauri::command]
pub fn projects_update_task_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    task_id: String,
    data: Value,
) -> ActionResult<Value> {
    update_task(&app, &session, &task_id, data)
}

#[tauri::command]
pub fn projects_delete_task_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    task_id: String,
) -> ActionResult<bool> {
    delete_task(&app, &session, &task_id)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusMigrationInput {
    pub from_status: String,
    pub to_status: String,
}

#[tauri::command]
pub fn projects_get_work_board_config_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<Value> {
    get_work_board_config(&app, &session)
}

#[tauri::command]
pub fn projects_save_work_board_config_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    save_work_board_config(&app, &session, data)
}

#[tauri::command]
pub fn projects_migrate_task_statuses_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: StatusMigrationInput,
) -> ActionResult<Value> {
    migrate_task_statuses(&app, &session, &input.from_status, &input.to_status)
}

#[tauri::command]
pub fn projects_migrate_project_statuses_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: StatusMigrationInput,
) -> ActionResult<Value> {
    migrate_project_statuses(&app, &session, &input.from_status, &input.to_status)
}
