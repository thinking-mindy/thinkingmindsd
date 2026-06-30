use serde::Serialize;
use serde_json::{json, Value};

use crate::admin::access::{doc_id, find_doc_index, org_id_matches, require_session_user, session_org, value_as_id};
use crate::auth::models::make_object_id;
use crate::auth::session::SessionState;
use crate::state::AppState;
use crate::store_util::{
    action_err, action_ok, delete_doc_by_id, doc_created_ms, get_doc, insert_org_doc, iso_now,
    read_org_docs, update_doc_by_id,
};
use crate::admin::service::ActionResult;
use crate::payroll::zw::{apply_zw_defaults, payroll_employer_cost, payroll_net_amount};

const COLLECTION: &str = "payroll_records";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HrEmployee {
    pub id: String,
    pub email: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub department: Option<String>,
}

pub fn get_org_members_for_hr(app: &AppState, session: &SessionState) -> ActionResult<Vec<HrEmployee>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let users = match read_org_docs(app, "users", &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let mut rows: Vec<HrEmployee> = users
        .into_iter()
        .map(|row| {
            let id = row
                .get("id")
                .or_else(|| row.get("clerkId"))
                .and_then(|v| v.as_str())
                .map(str::to_string)
                .or_else(|| row.get("_id").and_then(value_as_id))
                .unwrap_or_default();
            let email = row
                .get("email")
                .or_else(|| row.get("email_address"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let meta = row
                .get("metadata")
                .or_else(|| row.get("public_metadata"))
                .and_then(|v| v.as_object())
                .cloned()
                .unwrap_or_default();
            let first = meta
                .get("firstName")
                .or_else(|| meta.get("first_name"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let last = meta
                .get("lastName")
                .or_else(|| meta.get("last_name"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let name = format!("{first} {last}").trim().to_string();
            HrEmployee {
                id: id.clone(),
                email: email.clone(),
                name: if name.is_empty() {
                    if email.is_empty() { id } else { email }
                } else {
                    name
                },
                role: row
                    .get("role")
                    .or_else(|| meta.get("role"))
                    .and_then(|v| v.as_str())
                    .map(str::to_string),
                department: meta
                    .get("dep")
                    .or_else(|| meta.get("department"))
                    .and_then(|v| v.as_str())
                    .map(str::to_string),
            }
        })
        .collect();

    if rows.is_empty() {
        if let Ok(user) = require_session_user(app, session) {
            let name = format!(
                "{} {}",
                user.first_name.clone().unwrap_or_default(),
                user.last_name.clone().unwrap_or_default()
            )
            .trim()
            .to_string();
            let role = user
                .metadata
                .as_ref()
                .and_then(|m| m.get("role"))
                .and_then(|v| v.as_str())
                .map(str::to_string);
            rows.push(HrEmployee {
                id: user.id.clone(),
                email: user.email.clone(),
                name: if name.is_empty() {
                    user.email.clone()
                } else {
                    name
                },
                role,
                department: user
                    .metadata
                    .as_ref()
                    .and_then(|m| m.get("dep").or_else(|| m.get("department")))
                    .and_then(|v| v.as_str())
                    .map(str::to_string),
            });
        }
    }

    action_ok(rows)
}

pub fn create_payroll_record(
    app: &AppState,
    session: &SessionState,
    data: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut payload = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid payroll payload"),
    };
    payload = apply_zw_defaults(payload);
    payload.insert("createdAt".into(), json!(iso_now()));
    payload.insert("updatedAt".into(), json!(iso_now()));
    if !payload.contains_key("recordId") {
        payload.insert("recordId".into(), json!(make_object_id()));
    }
    if let Some(val) = payload.get("orgId").cloned() {
        payload.insert("orgId".into(), val);
    } else {
        payload.insert("orgId".into(), json!(org_id));
    }
    match insert_org_doc(app, COLLECTION, &org_id, payload) {
        Ok(v) => {
            let rec_id = doc_id(&v).unwrap_or_default();
            let employer_cost = payroll_employer_cost(&v);
            let net = payroll_net_amount(&v);
            let employee = v
                .get("employeeName")
                .and_then(|x| x.as_str())
                .or_else(|| v.get("employeeId").and_then(|x| x.as_str()));
            if let Err(e) = crate::finance::service::record_payroll_expense(app, &org_id, &v) {
                eprintln!("[payroll] expense sync failed: {e}");
            }
            crate::accounting::service::try_post_payroll(app, &org_id, &rec_id, employer_cost.max(net), employee);
            action_ok(v)
        }
        Err(e) => action_err(e),
    }
}

pub fn get_payroll_record(
    app: &AppState,
    session: &SessionState,
    record_id: &str,
) -> ActionResult<Value> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    match get_doc(app, COLLECTION, record_id) {
        Ok(v) => action_ok(v),
        Err(_) => action_ok(Value::Null),
    }
}

pub fn get_payroll_records_by_org(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = match read_org_docs(app, COLLECTION, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    rows.sort_by(|a, b| {
        let pa = a.get("payPeriod").and_then(|v| v.as_str()).unwrap_or("");
        let pb = b.get("payPeriod").and_then(|v| v.as_str()).unwrap_or("");
        pb.cmp(pa).then_with(|| doc_created_ms(b).cmp(&doc_created_ms(a)))
    });
    action_ok(rows)
}

pub fn get_payroll_records_for_current_org(
    app: &AppState,
    session: &SessionState,
    limit: usize,
) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = match read_org_docs(app, COLLECTION, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    rows.sort_by(|a, b| {
        let pa = a.get("payPeriod").and_then(|v| v.as_str()).unwrap_or("");
        let pb = b.get("payPeriod").and_then(|v| v.as_str()).unwrap_or("");
        pb.cmp(pa).then_with(|| doc_created_ms(b).cmp(&doc_created_ms(a)))
    });
    rows.truncate(limit);
    action_ok(rows)
}

pub fn get_payroll_records_by_employee(
    app: &AppState,
    session: &SessionState,
    employee_id: &str,
) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows: Vec<Value> = match read_org_docs(app, COLLECTION, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    }
    .into_iter()
    .filter(|doc| {
        doc.get("employeeId")
            .and_then(value_as_id)
            .map(|id| id == employee_id)
            .unwrap_or(false)
    })
    .collect();
    rows.sort_by(|a, b| {
        let pa = a.get("payPeriod").and_then(|v| v.as_str()).unwrap_or("");
        let pb = b.get("payPeriod").and_then(|v| v.as_str()).unwrap_or("");
        pb.cmp(pa)
    });
    action_ok(rows)
}

pub fn get_payroll_records_by_period(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
    pay_period: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let rows: Vec<Value> = match read_org_docs(app, COLLECTION, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    }
    .into_iter()
    .filter(|doc| doc.get("payPeriod").and_then(|v| v.as_str()) == Some(pay_period))
    .collect();
    action_ok(rows)
}

pub fn update_payroll_record(
    app: &AppState,
    session: &SessionState,
    record_id: &str,
    data: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let existing = match get_doc(app, COLLECTION, record_id) {
        Ok(v) => v,
        Err(_) => return action_err("Payroll record not found"),
    };
    if !org_id_matches(&existing, &org_id) {
        return action_err("Payroll record not found");
    }
    let mut patch = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid update payload"),
    };
    patch.remove("_id");
    patch.remove("orgId");
    patch.insert("updatedAt".into(), json!(iso_now()));
    match update_doc_by_id(app, COLLECTION, record_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(Value::Null),
        Err(e) => action_err(e),
    }
}

pub fn delete_payroll_record(
    app: &AppState,
    session: &SessionState,
    record_id: &str,
) -> ActionResult<bool> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let docs = match read_org_docs(app, COLLECTION, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    if find_doc_index(&docs, record_id).is_none() {
        return action_err("Payroll record not found");
    }
    match delete_doc_by_id(app, COLLECTION, record_id) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}
