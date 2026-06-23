use serde::Serialize;
use serde_json::{json, Value};

use crate::admin::access::{
    doc_id, find_doc_index, member_belongs_to_company, org_id_matches,
    require_owner, require_session_user, resolve_company_id, value_as_id,
};
use crate::admin::plans::{assign_free_plan_if_missing, ensure_default_plans, find_plan_by_id, find_plan_by_slug};
use crate::licensing::service::{build_license_status, LicenseStatusDto};
use crate::orgs::service::{get_org_doc, sync_local_org};
use crate::auth::session::SessionState;
use crate::auth::users::{load_users, save_users, update_user, OfflineUserPatch};
use crate::db::{self, store};
use crate::state::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyContextDto {
    pub success: bool,
    pub company_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub company_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminLoadPanelDto {
    pub company_context: CompanyContextDto,
    pub org: Option<Value>,
    pub current_plan: Option<Value>,
    pub all_plans: Vec<Value>,
    pub license_status: Option<LicenseStatusDto>,
    pub join_requests: Vec<Value>,
    pub members: Vec<Value>,
    pub payments: Vec<Value>,
    pub is_owner: bool,
}

#[derive(Serialize)]
pub struct ActionResult<T> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

pub fn admin_load_panel(app: &AppState, session: &SessionState) -> Result<AdminLoadPanelDto, String> {
    let user = require_session_user(app, session)?;
    let company_id = resolve_company_id(&user, app)?;
    let is_owner = crate::admin::access::is_company_owner(&user, app, &company_id)?;

    let company_name = user
        .metadata
        .as_ref()
        .and_then(|m| m.get("companyName"))
        .and_then(|v| v.as_str())
        .map(str::to_string);
    let email = Some(user.email.clone());

    sync_local_org(
        app,
        &user,
        &company_id,
        company_name.as_deref(),
        email.as_deref(),
        None,
        None,
    )?;

    let mut org = get_org_doc(app, &company_id)?;
    assign_free_plan_if_missing(app, &mut org)?;
    if org.get("planId").is_some() {
        let orgs = store::read_collection(&app.db_dir(), db::DB_NAME, "orgs")?;
        if let Some(idx) = find_doc_index(&orgs, &company_id) {
            let mut next = orgs;
            next[idx] = org.clone();
            store::write_collection(&app.db_dir(), db::DB_NAME, "orgs", &next)?;
        }
    }

    let all_plans = ensure_default_plans(app)?;
    let current_plan = resolve_current_plan(&org, &all_plans);
    let license_status = build_license_status(&company_id, &org, current_plan.as_ref());
    let join_requests = if is_owner {
        list_join_requests(app, &company_id)?
    } else {
        vec![]
    };
    let members = list_members(app, &company_id)?;
    let payments = if is_owner {
        list_payments(app, &company_id)?
    } else {
        vec![]
    };

    Ok(AdminLoadPanelDto {
        company_context: CompanyContextDto {
            success: true,
            company_id: company_id.clone(),
            company_name,
            email,
            error: None,
        },
        org: Some(org),
        current_plan,
        all_plans,
        license_status,
        join_requests,
        members,
        payments,
        is_owner,
    })
}

pub fn admin_update_org(
    app: &AppState,
    session: &SessionState,
    company_id: String,
    patch: Value,
) -> Result<ActionResult<Value>, String> {
    let ctx = require_owner(app, session)?;
    if ctx.company_id != company_id {
        return Err("Cannot update another organisation".into());
    }

    let mut orgs = store::read_collection(&app.db_dir(), db::DB_NAME, "orgs")?;
    let idx = find_doc_index(&orgs, &company_id).ok_or_else(|| "Organization not found".to_string())?;
    let allowed = ["name", "email", "address", "taxId", "logoUrl", "phone", "website"];
    if let Some(obj) = orgs[idx].as_object_mut() {
        if let Some(patch_obj) = patch.as_object() {
            for key in allowed {
                if let Some(val) = patch_obj.get(key) {
                    obj.insert(key.to_string(), val.clone());
                }
            }
        }
    }
    let updated = orgs[idx].clone();
    store::write_collection(&app.db_dir(), db::DB_NAME, "orgs", &orgs)?;
    Ok(ActionResult {
        success: true,
        data: Some(updated),
        error: None,
    })
}

pub fn admin_update_org_plan(
    app: &AppState,
    session: &SessionState,
    company_id: String,
    plan_id: String,
) -> Result<ActionResult<Value>, String> {
    let ctx = require_owner(app, session)?;
    if ctx.company_id != company_id {
        return Err("Cannot update another organisation".into());
    }

    let plans = ensure_default_plans(app)?;
    if find_plan_by_id(&plans, &plan_id).is_none() {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some("Plan not found".into()),
        });
    }

    let mut orgs = store::read_collection(&app.db_dir(), db::DB_NAME, "orgs")?;
    let idx = find_doc_index(&orgs, &company_id).ok_or_else(|| "Organization not found".to_string())?;
    if let Some(obj) = orgs[idx].as_object_mut() {
        obj.insert("planId".into(), json!(plan_id));
    }
    let updated = orgs[idx].clone();
    store::write_collection(&app.db_dir(), db::DB_NAME, "orgs", &orgs)?;
    Ok(ActionResult {
        success: true,
        data: Some(updated),
        error: None,
    })
}

pub fn admin_approve_join_request(
    app: &AppState,
    session: &SessionState,
    request_id: String,
) -> Result<ActionResult<()>, String> {
    let ctx = require_owner(app, session)?;
    let mut requests = store::read_collection(&app.db_dir(), db::DB_NAME, "join_requests")?;
    let idx = find_doc_index(&requests, &request_id).ok_or_else(|| "Request not found".to_string())?;
    let request = requests[idx].clone();

    if !org_id_matches(&request, &ctx.company_id) {
        return Err("Unauthorized".into());
    }
    if request.get("status").and_then(|v| v.as_str()) != Some("pending") {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some("Request is not pending".into()),
        });
    }

    let user_id = request
        .get("userId")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Invalid join request".to_string())?
        .to_string();
    let user_email = request
        .get("userEmail")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let org_name = request
        .get("orgName")
        .or_else(|| request.get("companyName"))
        .and_then(|v| v.as_str())
        .unwrap_or("Company")
        .to_string();

    if let Some(obj) = requests[idx].as_object_mut() {
        obj.insert("status".into(), json!("approved"));
        obj.insert("reviewedAt".into(), json!(iso_now()));
        obj.insert("reviewedBy".into(), json!(ctx.user.id));
    }
    store::write_collection(&app.db_dir(), db::DB_NAME, "join_requests", &requests)?;

    upsert_member_account(app, &user_id, &user_email, &ctx.company_id, &org_name)?;
    update_offline_user_membership(app, &user_id, &ctx.company_id, &org_name)?;

    Ok(ActionResult {
        success: true,
        data: Some(()),
        error: None,
    })
}

pub fn admin_reject_join_request(
    app: &AppState,
    session: &SessionState,
    request_id: String,
) -> Result<ActionResult<()>, String> {
    let ctx = require_owner(app, session)?;
    let mut requests = store::read_collection(&app.db_dir(), db::DB_NAME, "join_requests")?;
    let idx = find_doc_index(&requests, &request_id).ok_or_else(|| "Request not found".to_string())?;
    if !org_id_matches(&requests[idx], &ctx.company_id) {
        return Err("Unauthorized".into());
    }
    if let Some(obj) = requests[idx].as_object_mut() {
        obj.insert("status".into(), json!("rejected"));
        obj.insert("reviewedAt".into(), json!(iso_now()));
        obj.insert("reviewedBy".into(), json!(ctx.user.id));
    }
    store::write_collection(&app.db_dir(), db::DB_NAME, "join_requests", &requests)?;
    Ok(ActionResult {
        success: true,
        data: Some(()),
        error: None,
    })
}

pub fn admin_update_user_modules(
    app: &AppState,
    session: &SessionState,
    user_id: String,
    allowed_modules: Vec<String>,
) -> Result<ActionResult<()>, String> {
    let ctx = require_owner(app, session)?;
    let mut accounts = store::read_collection(&app.db_dir(), db::DB_NAME, "users")?;
    let idx = accounts
        .iter()
        .position(|row| row_user_id(row).as_deref() == Some(user_id.as_str()))
        .ok_or_else(|| "User not found".to_string())?;

    if !member_belongs_to_company(&accounts[idx], &ctx.company_id) {
        return Err("Cannot update modules for user in another organization".into());
    }

    let modules: Vec<Value> = allowed_modules.into_iter().map(Value::String).collect();
    if let Some(obj) = accounts[idx].as_object_mut() {
        obj.insert("public_metadata".into(), json!({ "allowedModules": modules }));
        obj.insert("publicMetadata".into(), json!({ "allowedModules": modules }));
    }
    store::write_collection(&app.db_dir(), db::DB_NAME, "users", &accounts)?;

    let mut offline_users = load_users(&app.secrets_dir())?;
    if let Some(offline) = offline_users.iter_mut().find(|u| u.id == user_id) {
        let mut meta = offline.metadata.clone().unwrap_or_else(|| json!({}));
        if let Some(obj) = meta.as_object_mut() {
            obj.insert("allowedModules".into(), json!(modules));
        }
        offline.metadata = Some(meta);
        save_users(&app.secrets_dir(), &offline_users)?;
    }

    Ok(ActionResult {
        success: true,
        data: Some(()),
        error: None,
    })
}

pub fn admin_list_local_users(app: &AppState, session: &SessionState) -> Result<ActionResult<Vec<Value>>, String> {
    let _ = require_owner(app, session)?;
    let users = store::read_collection(&app.db_dir(), db::DB_NAME, "users")?;
    Ok(ActionResult {
        success: true,
        data: Some(enrich_members(users)),
        error: None,
    })
}

pub fn admin_list_local_companies(
    app: &AppState,
    session: &SessionState,
) -> Result<ActionResult<Vec<Value>>, String> {
    let _ = require_owner(app, session)?;
    let orgs = store::read_collection(&app.db_dir(), db::DB_NAME, "orgs")?;
    Ok(ActionResult {
        success: true,
        data: Some(orgs),
        error: None,
    })
}

pub fn admin_delete_local_user(
    app: &AppState,
    session: &SessionState,
    user_id: String,
) -> Result<ActionResult<()>, String> {
    let ctx = require_owner(app, session)?;
    if ctx.user.id == user_id {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some("You cannot delete your own account while signed in".into()),
        });
    }

    let mut accounts = store::read_collection(&app.db_dir(), db::DB_NAME, "users")?;
    let before = accounts.len();
    accounts.retain(|row| row_user_id(row).as_deref() != Some(user_id.as_str()));
    if accounts.len() == before {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some("User not found in local database".into()),
        });
    }
    store::write_collection(&app.db_dir(), db::DB_NAME, "users", &accounts)?;

    let mut requests = store::read_collection(&app.db_dir(), db::DB_NAME, "join_requests")?;
    requests.retain(|row| row.get("userId").and_then(|v| v.as_str()) != Some(user_id.as_str()));
    store::write_collection(&app.db_dir(), db::DB_NAME, "join_requests", &requests)?;

    let _ = crate::auth::users::delete_user(&app.secrets_dir(), &user_id);

    Ok(ActionResult {
        success: true,
        data: Some(()),
        error: None,
    })
}

pub fn admin_delete_local_company(
    app: &AppState,
    session: &SessionState,
    company_id: String,
) -> Result<ActionResult<()>, String> {
    let ctx = require_owner(app, session)?;
    if ctx.company_id == company_id {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some("Cannot delete the company you are currently using".into()),
        });
    }

    let mut orgs = store::read_collection(&app.db_dir(), db::DB_NAME, "orgs")?;
    let before = orgs.len();
    orgs.retain(|org| doc_id(org).as_deref() != Some(company_id.as_str()));
    if orgs.len() == before {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some("Company not found".into()),
        });
    }
    store::write_collection(&app.db_dir(), db::DB_NAME, "orgs", &orgs)?;
    Ok(ActionResult {
        success: true,
        data: Some(()),
        error: None,
    })
}

fn resolve_current_plan(org: &Value, plans: &[Value]) -> Option<Value> {
    if let Some(plan_id) = org.get("planId").and_then(value_as_id) {
        if let Some(plan) = find_plan_by_id(plans, &plan_id) {
            return Some(plan.clone());
        }
    }
    find_plan_by_slug(plans, "free").cloned()
}

fn list_join_requests(app: &AppState, company_id: &str) -> Result<Vec<Value>, String> {
    let requests = store::read_collection(&app.db_dir(), db::DB_NAME, "join_requests")?;
    let mut rows: Vec<Value> = requests
        .into_iter()
        .filter(|r| org_id_matches(r, company_id))
        .collect();
    rows.sort_by(|a, b| {
        let at = a.get("requestedAt").and_then(|v| v.as_i64()).unwrap_or(0);
        let bt = b.get("requestedAt").and_then(|v| v.as_i64()).unwrap_or(0);
        bt.cmp(&at)
    });
    Ok(rows)
}

fn list_members(app: &AppState, company_id: &str) -> Result<Vec<Value>, String> {
    let accounts = store::read_collection(&app.db_dir(), db::DB_NAME, "users")?;
    let filtered: Vec<Value> = accounts
        .into_iter()
        .filter(|m| member_belongs_to_company(m, company_id))
        .collect();
    Ok(enrich_members(if filtered.is_empty() {
        store::read_collection(&app.db_dir(), db::DB_NAME, "users")?
    } else {
        filtered
    }))
}

fn list_payments(app: &AppState, company_id: &str) -> Result<Vec<Value>, String> {
    let payments = store::read_collection(&app.db_dir(), db::DB_NAME, "plan_payments").unwrap_or_else(|_| vec![]);
    let mut rows: Vec<Value> = payments
        .into_iter()
        .filter(|p| org_id_matches(p, company_id))
        .collect();
    if rows.is_empty() {
        let alt = store::read_collection(&app.db_dir(), db::DB_NAME, "payments").unwrap_or_default();
        rows = alt.into_iter().filter(|p| org_id_matches(p, company_id)).collect();
    }
    Ok(rows)
}

fn upsert_member_account(
    app: &AppState,
    user_id: &str,
    email: &str,
    company_id: &str,
    company_name: &str,
) -> Result<(), String> {
    let mut accounts = store::read_collection(&app.db_dir(), db::DB_NAME, "users")?;
    let doc = json!({
        "id": user_id,
        "clerkId": user_id,
        "email": email,
        "orgId": company_id,
        "role": "user",
        "metadata": { "companyId": company_id, "companyName": company_name },
        "publicMetadata": { "companyId": company_id, "companyName": company_name },
    });
    if let Some(idx) = accounts
        .iter()
        .position(|row| row_user_id(row).as_deref() == Some(user_id))
    {
        accounts[idx] = doc;
    } else {
        accounts.push(doc);
    }
    store::write_collection(&app.db_dir(), db::DB_NAME, "users", &accounts)
}

fn update_offline_user_membership(
    app: &AppState,
    user_id: &str,
    company_id: &str,
    company_name: &str,
) -> Result<(), String> {
    let _ = update_user(
        &app.secrets_dir(),
        user_id,
        OfflineUserPatch {
            company_id: Some(company_id.to_string()),
            metadata: Some(json!({
                "role": "user",
                "onCompleteSetup": true,
                "companyId": company_id,
                "companyName": company_name,
                "allowedModules": ["dashboard"],
            })),
            ..Default::default()
        },
    );
    Ok(())
}

fn enrich_members(rows: Vec<Value>) -> Vec<Value> {
    rows.into_iter()
        .map(|mut row| {
            let email = row
                .get("email")
                .and_then(|v| v.as_str())
                .map(str::to_string)
                .or_else(|| {
                    row.get("emailAddresses")
                        .and_then(|v| v.as_array())
                        .and_then(|a| a.first())
                        .and_then(|e| e.get("emailAddress"))
                        .and_then(|v| v.as_str())
                        .map(str::to_string)
                });
            let first = row
                .get("firstName")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let last = row
                .get("lastName")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let full = if first.is_empty() && last.is_empty() {
                email
                    .clone()
                    .and_then(|e| e.split('@').next().map(str::to_string))
                    .unwrap_or_else(|| "Unknown User".into())
            } else {
                format!("{first} {last}").trim().to_string()
            };
            if let Some(obj) = row.as_object_mut() {
                obj.insert("fullName".into(), json!(full));
                if let Some(email) = email {
                    obj.insert("email".into(), json!(email));
                }
            }
            row
        })
        .collect()
}

fn row_user_id(row: &Value) -> Option<String> {
    row.get("id")
        .or_else(|| row.get("clerkId"))
        .and_then(|v| v.as_str())
        .map(str::to_string)
}

fn iso_now() -> String {
    ms_to_iso(now_ms())
}

fn iso_expiry_days(days: i64) -> String {
    ms_to_iso(now_ms() + days * 86400 * 1000)
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn parse_iso_ms(value: &str) -> Option<i64> {
    crate::store_util::parse_iso_ms(value)
}

fn ms_to_iso(ms: i64) -> String {
    let secs = ms / 1000;
    let nanos = ((ms % 1000) * 1_000_000) as u32;
    format_rfc3339(secs, nanos)
}

fn format_rfc3339(secs: i64, _nanos: u32) -> String {
    let days = secs.div_euclid(86400);
    let rem = secs.rem_euclid(86400);
    let hour = rem / 3600;
    let minute = (rem % 3600) / 60;
    let second = rem % 60;
    let (year, month, day) = civil_from_days(days);
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}.000Z")
}

fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let y = if month <= 2 { year - 1 } else { year };
    let era = if year >= 0 { y / 400 } else { (y - 399) / 400 };
    let yoe = y - era * 400;
    let doy = (153 * (if month > 2 { month - 3 } else { month + 9 }) + 2) / 5 + day - 1;
    yoe * 365 + yoe / 4 - yoe / 100 + doy + era * 146097
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let era = if days >= 0 { days } else { days - 146096 } / 146097;
    let doe = days - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if month <= 2 { y + 1 } else { y };
    (year, month, day)
}
