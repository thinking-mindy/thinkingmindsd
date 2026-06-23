use serde_json::{json, Value};

use crate::db::{self, store};
use crate::state::AppState;

use super::models::{session_like_user, make_object_id, OfflineUser, PublicProfile};
use super::password::verify_password;
use super::session::{self, SessionState};
use super::users::{
    find_user_by_identifier, load_users, register_user, update_user, OfflineUserPatch,
};

const TRIAL_DAYS: i64 = 30;

pub fn authenticate(
    app: &AppState,
    session_state: &SessionState,
    identifier: &str,
    password: &str,
) -> Result<OfflineUser, String> {
    let users = load_users(&app.secrets_dir())?;
    let user = find_user_by_identifier(&users, identifier)
        .ok_or_else(|| "Invalid email/username or password".to_string())?;

    if !verify_password(password, &user.password_hash) {
        return Err("Invalid email/username or password".into());
    }

    let full = user.clone();
    session::start_session(&app.secrets_dir(), session_state, &full)?;
    sync_user_to_db(app, &full)?;
    Ok(full)
}

pub fn get_current_user(app: &AppState, session_state: &SessionState) -> Option<OfflineUser> {
    let session = session::active_session(session_state)?;
    let users = load_users(&app.secrets_dir()).ok()?;
    users.into_iter().find(|u| u.id == session.user_id)
}

pub fn logout(app: &AppState, session_state: &SessionState) -> Result<(), String> {
    session::clear_session(&app.secrets_dir(), session_state)
}

pub fn list_public_profiles(app: &AppState) -> Result<Vec<PublicProfile>, String> {
    let users = load_users(&app.secrets_dir())?;
    Ok(users.iter().map(PublicProfile::from_user).collect())
}

pub fn has_users(app: &AppState) -> Result<bool, String> {
    Ok(!load_users(&app.secrets_dir())?.is_empty())
}

pub fn register_owner(
    app: &AppState,
    session_state: &SessionState,
    email: &str,
    password: &str,
    username: Option<String>,
    first_name: Option<String>,
    last_name: Option<String>,
    company_name: &str,
) -> Result<OfflineUser, String> {
    let name = company_name.trim();
    if name.is_empty() {
        return Err("Company name is required".into());
    }

    let company_id = make_object_id();
    let user = register_user(
        &app.secrets_dir(),
        email,
        password,
        username,
        first_name,
        last_name,
        Some(json!({
            "role": "owner",
            "companyOwnerId": null,
            "onCompleteSetup": true,
            "companyId": company_id,
            "companyName": name,
        })),
    )?;

    let metadata = json!({
        "role": "owner",
        "companyOwnerId": user.id,
        "onCompleteSetup": true,
        "companyId": company_id,
        "companyName": name,
    });

    let user = update_user(
        &app.secrets_dir(),
        &user.id,
        OfflineUserPatch {
            company_id: Some(company_id.clone()),
            metadata: Some(metadata),
            ..Default::default()
        },
    )?;

    create_org_record(app, &company_id, &user, name)?;
    session::start_session(&app.secrets_dir(), session_state, &user)?;
    sync_user_to_db(app, &user)?;
    Ok(user)
}

pub fn register_join(
    app: &AppState,
    session_state: &SessionState,
    email: &str,
    password: &str,
    username: Option<String>,
    first_name: Option<String>,
    last_name: Option<String>,
    company_id: &str,
    company_name: &str,
    owner_id: &str,
) -> Result<OfflineUser, String> {
    let metadata = json!({
        "role": "pending",
        "onCompleteSetup": false,
        "pendingCompanyId": company_id,
        "pendingCompanyName": company_name,
    });

    let user = register_user(
        &app.secrets_dir(),
        email,
        password,
        username.clone(),
        first_name.clone(),
        last_name.clone(),
        Some(metadata),
    )?;

    create_join_request(app, company_id, &user, company_name, owner_id)?;
    session::start_session(&app.secrets_dir(), session_state, &user)?;
    sync_user_to_db(app, &user)?;
    Ok(user)
}

pub fn list_companies_for_register(app: &AppState) -> Result<Vec<CompanyOption>, String> {
    let orgs = store::read_collection(&app.db_dir(), db::DB_NAME, "orgs")?;
    Ok(orgs
        .into_iter()
        .filter_map(|org| {
            let id = org.get("_id").and_then(|v| value_to_id(Some(v)))?;
            let name = org.get("name").and_then(|v| v.as_str())?.to_string();
            let owner_id = org
                .get("ownerId")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            Some(CompanyOption {
                id,
                name,
                created_by_user_id: owner_id,
            })
        })
        .collect())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyOption {
    pub id: String,
    pub name: String,
    pub created_by_user_id: String,
}

pub fn session_user_json(user: &OfflineUser) -> Value {
    session_like_user(user)
}

fn create_org_record(
    app: &AppState,
    company_id: &str,
    user: &OfflineUser,
    company_name: &str,
) -> Result<(), String> {
    let mut orgs = store::read_collection(&app.db_dir(), db::DB_NAME, "orgs")?;
    if orgs.iter().any(|o| value_to_id(o.get("_id")) == Some(company_id.to_string())) {
        return Ok(());
    }

    let now = chrono_now_iso();
    let expiry = chrono_expiry_iso(TRIAL_DAYS);

    orgs.push(json!({
        "_id": company_id,
        "name": company_name,
        "email": user.email,
        "ownerId": user.id,
        "createdAt": now,
        "trialStartedAt": now,
        "licenseExpiresAt": expiry,
        "billingStatus": "active",
        "billingTier": "company",
    }));

    store::write_collection(&app.db_dir(), db::DB_NAME, "orgs", &orgs)
}

fn create_join_request(
    app: &AppState,
    company_id: &str,
    user: &OfflineUser,
    company_name: &str,
    owner_id: &str,
) -> Result<(), String> {
    let mut requests = store::read_collection(&app.db_dir(), db::DB_NAME, "join_requests")?;
    let display_name = format!(
        "{} {}",
        user.first_name.clone().unwrap_or_default(),
        user.last_name.clone().unwrap_or_default()
    )
    .trim()
    .to_string();
    let display_name = if display_name.is_empty() {
        user.email.clone()
    } else {
        display_name
    };

    requests.push(json!({
        "_id": make_object_id(),
        "companyId": company_id,
        "userId": user.id,
        "userEmail": user.email,
        "userName": display_name,
        "companyName": company_name,
        "ownerId": owner_id,
        "status": "pending",
        "requestedAt": session::now_ms(),
        "createdAt": chrono_now_iso(),
    }));

    store::write_collection(&app.db_dir(), db::DB_NAME, "join_requests", &requests)
}

fn sync_user_to_db(app: &AppState, user: &OfflineUser) -> Result<(), String> {
    let mut accounts = store::read_collection(&app.db_dir(), db::DB_NAME, "users")?;
    let org_id = user.company_id.clone().or_else(|| {
        user.metadata
            .as_ref()
            .and_then(|m| m.get("companyId"))
            .and_then(|v| v.as_str())
            .map(str::to_string)
    });

    let role = user
        .metadata
        .as_ref()
        .and_then(|m| m.get("role"))
        .and_then(|v| v.as_str())
        .unwrap_or("user");

    let doc = json!({
        "id": user.id,
        "clerkId": user.id,
        "email": user.email,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "fullName": full_name(user),
        "orgId": org_id,
        "role": role,
        "metadata": user.metadata.clone().unwrap_or_else(|| json!({})),
        "publicMetadata": user.metadata.clone().unwrap_or_else(|| json!({})),
    });

    if let Some(index) = accounts
        .iter()
        .position(|row| row.get("id").and_then(|v| v.as_str()) == Some(user.id.as_str()))
    {
        accounts[index] = doc;
    } else {
        accounts.push(doc);
    }

    store::write_collection(&app.db_dir(), db::DB_NAME, "users", &accounts)
}

fn full_name(user: &OfflineUser) -> String {
    let name = format!(
        "{} {}",
        user.first_name.clone().unwrap_or_default(),
        user.last_name.clone().unwrap_or_default()
    )
    .trim()
    .to_string();
    if name.is_empty() {
        user.email.clone()
    } else {
        name
    }
}

fn value_to_id(value: Option<&Value>) -> Option<String> {
    let v = value?;
    if let Some(s) = v.as_str() {
        return Some(s.to_string());
    }
    if let Some(obj) = v.as_object() {
        if let Some(oid) = obj.get("$oid").and_then(|x| x.as_str()) {
            return Some(oid.to_string());
        }
    }
    None
}

fn chrono_now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    // ISO-like without external chrono crate
    format_iso_from_secs(secs)
}

fn chrono_expiry_iso(days: i64) -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64 + days * 86400)
        .unwrap_or(0);
    format_iso_from_secs(secs)
}

fn format_iso_from_secs(secs: i64) -> String {
    // Simple UTC ISO string via manual calc — good enough for local JSON DB
    let days_since_epoch = secs / 86400;
    let day_seconds = secs % 86400;
    let hours = day_seconds / 3600;
    let minutes = (day_seconds % 3600) / 60;
    let seconds = day_seconds % 60;

    let mut year = 1970i64;
    let mut remaining_days = days_since_epoch;
    loop {
        let days_in_year = if is_leap(year) { 366 } else { 365 };
        if remaining_days < days_in_year {
            break;
        }
        remaining_days -= days_in_year;
        year += 1;
    }

    let month_days = if is_leap(year) {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    let mut month = 1;
    for dim in month_days {
        if remaining_days < dim {
            break;
        }
        remaining_days -= dim;
        month += 1;
    }
    let day = remaining_days + 1;

    format!(
        "{year:04}-{month:02}-{day:02}T{hours:02}:{minutes:02}:{seconds:02}.000Z"
    )
}

fn is_leap(year: i64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}
