use serde::Deserialize;
use serde_json::{json, Value};

use crate::admin::access::{
    find_doc_by_id, find_doc_index, require_session_user, resolve_company_id,
};
use crate::admin::plans::assign_free_plan_if_missing;
use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::db::{self, store};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncLocalOrgInput {
    pub company_id: Option<String>,
    pub company_name: Option<String>,
    pub email: Option<String>,
    pub trial_started_at: Option<String>,
    pub license_expires_at: Option<String>,
}

pub fn get_org(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
) -> Result<ActionResult<Value>, String> {
    let user = require_session_user(app, session)?;
    let company_id = resolve_company_id(&user, app)?;
    if company_id != org_id {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some("Organization not found".into()),
        });
    }

    let mut org = get_org_doc(app, org_id)?;
    assign_free_plan_if_missing(app, &mut org)?;
    if org.get("planId").is_some() {
        persist_org(app, org_id, &org)?;
    }

    Ok(ActionResult {
        success: true,
        data: Some(org),
        error: None,
    })
}

pub fn create_org(
    app: &AppState,
    session: &SessionState,
    data: Value,
) -> Result<ActionResult<Value>, String> {
    let user = require_session_user(app, session)?;
    let mut payload = data
        .as_object()
        .cloned()
        .ok_or_else(|| "Invalid organization payload".to_string())?;

    let company_name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "Organization name is required".to_string())?
        .to_string();

    payload.remove("_id");
    payload.insert("ownerId".into(), json!(user.id.clone()));
    payload.insert("createdAt".into(), json!(iso_now()));
    if !payload.contains_key("billingStatus") {
        payload.insert("billingStatus".into(), json!("active"));
    }

    let org_id = crate::auth::models::make_object_id();
    payload.insert("_id".into(), json!(org_id.clone()));
    let mut org = Value::Object(payload);
    assign_free_plan_if_missing(app, &mut org)?;

    let mut orgs = store::read_collection(&app.db_dir(), db::DB_NAME, "orgs").unwrap_or_default();
    orgs.push(org.clone());
    store::write_collection(&app.db_dir(), db::DB_NAME, "orgs", &orgs)?;

    upsert_member_account(
        app,
        &user.id,
        &user.email,
        &org_id,
        &company_name,
    )?;

    Ok(ActionResult {
        success: true,
        data: Some(org),
        error: None,
    })
}

pub fn search_orgs(
    app: &AppState,
    session: &SessionState,
    query: &str,
    limit: usize,
) -> Result<ActionResult<Vec<Value>>, String> {
    let _user = require_session_user(app, session)?;
    let needle = query.trim().to_lowercase();
    if needle.is_empty() {
        return Ok(ActionResult {
            success: true,
            data: Some(vec![]),
            error: None,
        });
    }

    let orgs = store::read_collection(&app.db_dir(), db::DB_NAME, "orgs")?;
    let mut rows: Vec<Value> = orgs
        .into_iter()
        .filter(|org| {
            org.get("name")
                .and_then(|v| v.as_str())
                .map(|name| name.to_lowercase().contains(&needle))
                .unwrap_or(false)
        })
        .take(limit)
        .collect();

    rows.sort_by(|a, b| {
        let an = a
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_lowercase();
        let bn = b
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_lowercase();
        an.cmp(&bn)
    });

    Ok(ActionResult {
        success: true,
        data: Some(rows),
        error: None,
    })
}

pub fn sync_local_org_to_database(
    app: &AppState,
    session: &SessionState,
    input: Option<SyncLocalOrgInput>,
) -> Result<ActionResult<Value>, String> {
    let user = require_session_user(app, session)?;
    let company_id = input
        .as_ref()
        .and_then(|i| i.company_id.as_deref())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .or_else(|| resolve_company_id(&user, app).ok());

    let Some(company_id) = company_id else {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some("No company id linked to this account".into()),
        });
    };

    let company_name = input
        .as_ref()
        .and_then(|i| i.company_name.as_deref())
        .or_else(|| {
            user.metadata
                .as_ref()
                .and_then(|m| m.get("companyName"))
                .and_then(|v| v.as_str())
        });
    let email = input
        .as_ref()
        .and_then(|i| i.email.as_deref())
        .or(Some(user.email.as_str()));

    sync_local_org(
        app,
        &user,
        &company_id,
        company_name,
        email,
        input.as_ref().and_then(|i| i.trial_started_at.as_deref()),
        input.as_ref().and_then(|i| i.license_expires_at.as_deref()),
    )?;

    let org = get_org_doc(app, &company_id)?;
    Ok(ActionResult {
        success: true,
        data: Some(org),
        error: None,
    })
}

pub fn get_org_doc(app: &AppState, company_id: &str) -> Result<Value, String> {
    let orgs = store::read_collection(&app.db_dir(), db::DB_NAME, "orgs")?;
    find_doc_by_id(&orgs, company_id)
        .cloned()
        .ok_or_else(|| "Organization not found".to_string())
}

pub fn persist_org(app: &AppState, company_id: &str, org: &Value) -> Result<(), String> {
    let mut orgs = store::read_collection(&app.db_dir(), db::DB_NAME, "orgs")?;
    if let Some(idx) = find_doc_index(&orgs, company_id) {
        orgs[idx] = org.clone();
        store::write_collection(&app.db_dir(), db::DB_NAME, "orgs", &orgs)?;
    }
    Ok(())
}

pub fn sync_local_org(
    app: &AppState,
    user: &crate::auth::models::OfflineUser,
    company_id: &str,
    company_name: Option<&str>,
    email: Option<&str>,
    trial_started_at: Option<&str>,
    license_expires_at: Option<&str>,
) -> Result<(), String> {
    let mut orgs = store::read_collection(&app.db_dir(), db::DB_NAME, "orgs")?;
    if find_doc_index(&orgs, company_id).is_none() {
        let name = company_name.unwrap_or("Company");
        let now = iso_now();
        let trial = trial_started_at
            .map(str::to_string)
            .unwrap_or_else(|| now.clone());
        let expiry = license_expires_at
            .map(str::to_string)
            .unwrap_or_else(|| iso_expiry_days(30));
        let mut doc = json!({
            "_id": company_id,
            "name": name,
            "email": email,
            "ownerId": user.id,
            "createdAt": now,
            "trialStartedAt": trial,
            "licenseExpiresAt": expiry,
            "billingStatus": "active",
            "billingTier": "company",
        });
        assign_free_plan_if_missing(app, &mut doc)?;
        orgs.push(doc);
        store::write_collection(&app.db_dir(), db::DB_NAME, "orgs", &orgs)?;
    } else if let Some(idx) = find_doc_index(&orgs, company_id) {
        if let Some(obj) = orgs[idx].as_object_mut() {
            if let Some(name) = company_name {
                obj.insert("name".into(), json!(name));
            }
            if let Some(email) = email {
                obj.insert("email".into(), json!(email));
            }
            if let (Some(trial), Some(expiry)) = (trial_started_at, license_expires_at) {
                obj.insert("trialStartedAt".into(), json!(trial));
                obj.insert("licenseExpiresAt".into(), json!(expiry));
            }
        }
        store::write_collection(&app.db_dir(), db::DB_NAME, "orgs", &orgs)?;
    }

    upsert_member_account(app, &user.id, &user.email, company_id, company_name.unwrap_or("Company"))?;
    Ok(())
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
    if let Some(idx) = accounts.iter().position(|row| row_user_id(row).as_deref() == Some(user_id)) {
        accounts[idx] = doc;
    } else {
        accounts.push(doc);
    }
    store::write_collection(&app.db_dir(), db::DB_NAME, "users", &accounts)
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

fn ms_to_iso(ms: i64) -> String {
    let secs = ms / 1000;
    let rem = secs.rem_euclid(86400);
    let hour = rem / 3600;
    let minute = (rem % 3600) / 60;
    let second = rem % 60;
    let days = secs.div_euclid(86400);
    let (year, month, day) = civil_from_days(days);
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}.000Z")
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
