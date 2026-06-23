use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::payroll::leave_service::{
    create_leave_request, delete_leave_request, get_leave_request, get_leave_requests_by_employee,
    get_leave_requests_by_org, get_leave_requests_by_status, get_leave_requests_for_current_org,
    update_leave_request,
};
use crate::payroll::service::{
    create_payroll_record, delete_payroll_record, get_org_members_for_hr, get_payroll_record,
    get_payroll_records_by_employee, get_payroll_records_by_org, get_payroll_records_by_period,
    get_payroll_records_for_current_org, update_payroll_record, HrEmployee,
};
use crate::state::AppState;

#[tauri::command]
pub fn payroll_get_org_members_for_hr_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<Vec<HrEmployee>> {
    get_org_members_for_hr(&app, &session)
}

#[tauri::command]
pub fn payroll_create_record_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_payroll_record(&app, &session, data)
}

#[tauri::command]
pub fn payroll_get_record_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    record_id: String,
) -> ActionResult<Value> {
    get_payroll_record(&app, &session, &record_id)
}

#[tauri::command]
pub fn payroll_get_records_by_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
) -> ActionResult<Vec<Value>> {
    get_payroll_records_by_org(&app, &session, &org_id)
}

#[tauri::command]
pub fn payroll_get_records_for_current_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    limit: Option<usize>,
) -> ActionResult<Vec<Value>> {
    get_payroll_records_for_current_org(&app, &session, limit.unwrap_or(500))
}

#[tauri::command]
pub fn payroll_get_records_by_employee_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    employee_id: String,
) -> ActionResult<Vec<Value>> {
    get_payroll_records_by_employee(&app, &session, &employee_id)
}

#[tauri::command]
pub fn payroll_get_records_by_period_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
    pay_period: String,
) -> ActionResult<Vec<Value>> {
    get_payroll_records_by_period(&app, &session, &org_id, &pay_period)
}

#[tauri::command]
pub fn payroll_update_record_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    record_id: String,
    data: Value,
) -> ActionResult<Value> {
    update_payroll_record(&app, &session, &record_id, data)
}

#[tauri::command]
pub fn payroll_delete_record_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    record_id: String,
) -> ActionResult<bool> {
    delete_payroll_record(&app, &session, &record_id)
}

#[tauri::command]
pub fn payroll_create_leave_request_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_leave_request(&app, &session, data)
}

#[tauri::command]
pub fn payroll_get_leave_request_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    request_id: String,
) -> ActionResult<Value> {
    get_leave_request(&app, &session, &request_id)
}

#[tauri::command]
pub fn payroll_get_leave_requests_by_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
) -> ActionResult<Vec<Value>> {
    get_leave_requests_by_org(&app, &session, &org_id)
}

#[tauri::command]
pub fn payroll_get_leave_requests_for_current_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    limit: Option<usize>,
) -> ActionResult<Vec<Value>> {
    get_leave_requests_for_current_org(&app, &session, limit.unwrap_or(300))
}

#[tauri::command]
pub fn payroll_get_leave_requests_by_employee_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    employee_id: String,
) -> ActionResult<Vec<Value>> {
    get_leave_requests_by_employee(&app, &session, &employee_id)
}

#[tauri::command]
pub fn payroll_get_leave_requests_by_status_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
    status: String,
) -> ActionResult<Vec<Value>> {
    get_leave_requests_by_status(&app, &session, &org_id, &status)
}

#[tauri::command]
pub fn payroll_update_leave_request_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    request_id: String,
    data: Value,
) -> ActionResult<Value> {
    update_leave_request(&app, &session, &request_id, data)
}

#[tauri::command]
pub fn payroll_delete_leave_request_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    request_id: String,
) -> ActionResult<bool> {
    delete_leave_request(&app, &session, &request_id)
}
