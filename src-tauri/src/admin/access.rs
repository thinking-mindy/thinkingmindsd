use serde_json::Value;

use crate::auth::models::OfflineUser;
use crate::auth::session::SessionState;
use crate::auth::service;
use crate::db::{self, store};
use crate::state::AppState;

pub struct OwnerContext {
    pub user: OfflineUser,
    pub company_id: String,
}

pub fn require_session_user(
    app: &AppState,
    session: &SessionState,
) -> Result<OfflineUser, String> {
    service::get_current_user(app, session).ok_or_else(|| "Not signed in".to_string())
}

pub fn session_org(
    app: &AppState,
    session: &SessionState,
) -> Result<(OfflineUser, String), String> {
    let user = require_session_user(app, session)?;
    let company_id = resolve_company_id(&user, app)?;
    Ok((user, company_id))
}

pub fn resolve_company_id(user: &OfflineUser, app: &AppState) -> Result<String, String> {
    if let Some(id) = user.company_id.clone().filter(|s| !s.is_empty()) {
        return Ok(id);
    }
    if let Some(meta) = &user.metadata {
        if let Some(id) = meta.get("companyId").and_then(|v| v.as_str()) {
            if !id.is_empty() {
                return Ok(id.to_string());
            }
        }
    }

    let accounts = store::read_collection(&app.db_dir(), db::DB_NAME, "users")?;
    for row in accounts {
        let row_id = row.get("id").or_else(|| row.get("clerkId")).and_then(|v| v.as_str());
        if row_id != Some(user.id.as_str()) {
            continue;
        }
        if let Some(org_id) = row.get("orgId").and_then(value_as_id) {
            return Ok(org_id);
        }
    }

    Err("No company linked to this account".to_string())
}

pub fn is_company_owner(user: &OfflineUser, app: &AppState, company_id: &str) -> Result<bool, String> {
    let meta = user.metadata.clone().unwrap_or_else(|| serde_json::json!({}));
    let role = meta.get("role").and_then(|v| v.as_str()).unwrap_or("");
    if role == "owner" {
        return Ok(true);
    }
    if meta
        .get("companyOwnerId")
        .and_then(|v| v.as_str())
        .map(|id| id == user.id)
        .unwrap_or(false)
    {
        return Ok(true);
    }

    let orgs = store::read_collection(&app.db_dir(), db::DB_NAME, "orgs")?;
    let org = find_doc_by_id(&orgs, company_id);
    Ok(org
        .and_then(|o| o.get("ownerId").and_then(|v| v.as_str()))
        .map(|owner| owner == user.id)
        .unwrap_or(false))
}

pub fn require_owner(app: &AppState, session: &SessionState) -> Result<OwnerContext, String> {
    let user = require_session_user(app, session)?;
    let company_id = resolve_company_id(&user, app)?;
    if !is_company_owner(&user, app, &company_id)? {
        return Err("Only the organisation owner can perform this action".to_string());
    }
    Ok(OwnerContext { user, company_id })
}

pub fn value_as_id(value: &Value) -> Option<String> {
    if let Some(s) = value.as_str() {
        return Some(s.to_string());
    }
    value
        .as_object()
        .and_then(|o| o.get("$oid"))
        .and_then(|v| v.as_str())
        .map(str::to_string)
}

pub fn find_doc_by_id<'a>(docs: &'a [Value], id: &str) -> Option<&'a Value> {
    docs.iter().find(|doc| doc_id(doc).as_deref() == Some(id))
}

pub fn find_doc_index(docs: &[Value], id: &str) -> Option<usize> {
    docs.iter().position(|doc| doc_id(doc).as_deref() == Some(id))
}

pub fn doc_id(doc: &Value) -> Option<String> {
    doc.get("_id").and_then(value_as_id)
}

pub fn org_id_matches(doc: &Value, company_id: &str) -> bool {
    doc.get("orgId")
        .and_then(value_as_id)
        .map(|id| id == company_id)
        .unwrap_or(false)
        || doc
            .get("companyId")
            .and_then(|v| v.as_str())
            .map(|id| id == company_id)
            .unwrap_or(false)
}

pub fn member_belongs_to_company(member: &Value, company_id: &str) -> bool {
    if org_id_matches(member, company_id) {
        return true;
    }
    for key in ["public_metadata", "publicMetadata", "private_metadata"] {
        if let Some(meta) = member.get(key).and_then(|v| v.as_object()) {
            if meta
                .get("companyId")
                .and_then(|v| v.as_str())
                .map(|id| id == company_id)
                .unwrap_or(false)
            {
                return true;
            }
        }
    }
    false
}
