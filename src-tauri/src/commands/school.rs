use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::school::service::{
    build_school_fee_snapshot, create_school_class, create_school_classes_from_templates,
    create_school_student, delete_school_class, delete_school_student, get_school_classes,
    get_school_dashboard_stats, get_school_receipt_fee_info, get_school_settings, get_school_student,
    get_school_students, get_school_students_with_balances, get_student_term_fee_balance,
    update_school_class, update_school_settings, update_school_student,
};
use crate::state::AppState;

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SchoolClassesFilters {
    pub org_id: Option<String>,
    pub education_level: Option<String>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SchoolStudentsFilters {
    pub org_id: Option<String>,
    pub status: Option<String>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SchoolBalancesFilters {
    pub org_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildSchoolFeeSnapshotInput {
    pub org_id: String,
    pub student_id: String,
    #[serde(default)]
    pub additional_payment: f64,
    pub exclude_tx_id: Option<String>,
}

#[tauri::command]
pub fn school_get_settings_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
) -> ActionResult<Value> {
    get_school_settings(&app, &session, org_id.as_deref())
}

#[tauri::command]
pub fn school_update_settings_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: Value,
) -> ActionResult<Value> {
    update_school_settings(&app, &session, input)
}

#[tauri::command]
pub fn school_get_classes_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    filters: Option<SchoolClassesFilters>,
) -> ActionResult<Vec<Value>> {
    let f = filters.unwrap_or_default();
    get_school_classes(
        &app,
        &session,
        f.org_id.as_deref(),
        f.education_level.as_deref(),
    )
}

#[tauri::command]
pub fn school_create_class_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: Value,
) -> ActionResult<Value> {
    create_school_class(&app, &session, input)
}

#[tauri::command]
pub fn school_update_class_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    class_id: String,
    input: Value,
) -> ActionResult<()> {
    update_school_class(&app, &session, &class_id, input)
}

#[tauri::command]
pub fn school_delete_class_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    class_id: String,
) -> ActionResult<()> {
    delete_school_class(&app, &session, &class_id)
}

#[tauri::command]
pub fn school_get_students_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    filters: Option<SchoolStudentsFilters>,
) -> ActionResult<Vec<Value>> {
    let f = filters.unwrap_or_default();
    get_school_students(&app, &session, f.org_id.as_deref(), f.status.as_deref())
}

#[tauri::command]
pub fn school_get_student_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    student_id: String,
) -> ActionResult<Value> {
    get_school_student(&app, &session, &student_id)
}

#[tauri::command]
pub fn school_create_student_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: Value,
) -> ActionResult<Value> {
    create_school_student(&app, &session, input)
}

#[tauri::command]
pub fn school_update_student_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    student_id: String,
    input: Value,
) -> ActionResult<()> {
    update_school_student(&app, &session, &student_id, input)
}

#[tauri::command]
pub fn school_delete_student_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    student_id: String,
) -> ActionResult<()> {
    delete_school_student(&app, &session, &student_id)
}

#[tauri::command]
pub fn school_build_fee_snapshot_cmd(
    app: State<'_, AppState>,
    input: BuildSchoolFeeSnapshotInput,
) -> Result<Option<Value>, String> {
    build_school_fee_snapshot(
        &app,
        &input.org_id,
        &input.student_id,
        input.additional_payment,
        input.exclude_tx_id.as_deref(),
    )
}

#[tauri::command]
pub fn school_get_student_term_fee_balance_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    student_id: String,
    additional_payment: Option<f64>,
) -> ActionResult<Value> {
    get_student_term_fee_balance(&app, &session, &student_id, additional_payment.unwrap_or(0.0))
}

#[tauri::command]
pub fn school_get_receipt_fee_info_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    student_id: String,
) -> ActionResult<Option<Value>> {
    get_school_receipt_fee_info(&app, &session, &student_id)
}

#[tauri::command]
pub fn school_get_students_with_balances_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    filters: Option<SchoolBalancesFilters>,
) -> ActionResult<Vec<Value>> {
    let f = filters.unwrap_or_default();
    get_school_students_with_balances(&app, &session, f.org_id.as_deref())
}

#[tauri::command]
pub fn school_create_classes_from_templates_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    education_level: String,
) -> ActionResult<Value> {
    create_school_classes_from_templates(&app, &session, &education_level)
}

#[tauri::command]
pub fn school_get_dashboard_stats_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: Option<String>,
) -> ActionResult<Value> {
    get_school_dashboard_stats(&app, &session, org_id.as_deref())
}
