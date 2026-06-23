use serde::Deserialize;
use serde_json::{json, Value};

use crate::admin::access::{find_doc_by_id, org_id_matches, require_owner, require_session_user, session_org};
use crate::admin::service::{admin_approve_join_request, admin_reject_join_request, ActionResult};
use crate::auth::session::SessionState;
use crate::db::{self, store};
use crate::store_util::{iso_now, now_ms};
use crate::state::AppState;

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OfflineJoinRequestInput {
    pub company_id: String,
    pub user_id: String,
    pub user_email: String,
    pub user_name: String,
    pub status: String,
    pub requested_at: i64,
}

pub fn create_join_request(
    app: &AppState,
    session: &SessionState,
    org_id: String,
    user_email: String,
    user_name: String,
) -> Result<ActionResult<Value>, String> {
    let user = require_session_user(app, session)?;
    let orgs = store::read_collection(&app.db_dir(), db::DB_NAME, "orgs")?;
    if find_doc_by_id(&orgs, &org_id).is_none() {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some("Company not found".into()),
        });
    }

    let mut requests = store::read_collection(&app.db_dir(), db::DB_NAME, "join_requests").unwrap_or_default();
    let duplicate = requests.iter().any(|r| {
        org_id_matches(r, &org_id)
            && r.get("userId").and_then(|v| v.as_str()) == Some(user.id.as_str())
            && r.get("status").and_then(|v| v.as_str()) == Some("pending")
    });
    if duplicate {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some("You already have a pending request for this company".into()),
        });
    }
    let user_accounts = store::read_collection(&app.db_dir(), db::DB_NAME, "users").unwrap_or_default();
    let already_member = user_accounts.iter().any(|row| {
        let row_user_id = row
            .get("id")
            .or_else(|| row.get("clerkId"))
            .and_then(|v| v.as_str());
        row_user_id == Some(user.id.as_str()) && org_id_matches(row, &org_id)
    });
    if already_member {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some("You are already a member of this company".into()),
        });
    }

    let request = json!({
        "_id": crate::auth::models::make_object_id(),
        "orgId": org_id,
        "userId": user.id,
        "userEmail": user_email,
        "userName": user_name,
        "status": "pending",
        "requestedAt": iso_now(),
    });
    requests.push(request.clone());
    store::write_collection(&app.db_dir(), db::DB_NAME, "join_requests", &requests)?;

    Ok(ActionResult {
        success: true,
        data: Some(request),
        error: None,
    })
}

pub fn get_join_requests_for_current_org(
    app: &AppState,
    session: &SessionState,
) -> Result<ActionResult<Vec<Value>>, String> {
    let (_user, company_id) = session_org(app, session)?;
    let requests = store::read_collection(&app.db_dir(), db::DB_NAME, "join_requests").unwrap_or_default();
    let mut rows: Vec<Value> = requests
        .into_iter()
        .filter(|r| org_id_matches(r, &company_id))
        .collect();
    rows.sort_by_key(|r| {
        std::cmp::Reverse(
            r.get("requestedAt")
                .and_then(|v| v.as_str())
                .and_then(crate::store_util::parse_iso_ms)
                .unwrap_or(0),
        )
    });
    Ok(ActionResult {
        success: true,
        data: Some(rows),
        error: None,
    })
}

pub fn import_offline_join_requests(
    app: &AppState,
    session: &SessionState,
    requests: Vec<OfflineJoinRequestInput>,
) -> Result<ActionResult<Value>, String> {
    let ctx = require_owner(app, session)?;
    if requests.is_empty() {
        return Ok(ActionResult {
            success: true,
            data: Some(json!({ "imported": 0 })),
            error: None,
        });
    }

    let mut docs = store::read_collection(&app.db_dir(), db::DB_NAME, "join_requests").unwrap_or_default();
    let mut imported = 0usize;
    for row in requests {
        if row.company_id != ctx.company_id {
            continue;
        }
        let status = match row.status.as_str() {
            "pending" | "approved" | "rejected" => row.status,
            _ => "pending".to_string(),
        };
        let exists = docs.iter().any(|d| {
            org_id_matches(d, &ctx.company_id)
                && d.get("userId").and_then(|v| v.as_str()) == Some(row.user_id.as_str())
                && d.get("status").and_then(|v| v.as_str()) == Some(status.as_str())
        });
        if exists {
            continue;
        }
        let requested_at = if row.requested_at > 0 { row.requested_at } else { now_ms() };
        docs.push(json!({
            "_id": crate::auth::models::make_object_id(),
            "orgId": ctx.company_id,
            "userId": row.user_id,
            "userEmail": row.user_email,
            "userName": row.user_name,
            "status": status,
            "requestedAt": crate::store_util::ms_to_iso(requested_at),
        }));
        imported += 1;
    }

    store::write_collection(&app.db_dir(), db::DB_NAME, "join_requests", &docs)?;
    Ok(ActionResult {
        success: true,
        data: Some(json!({ "imported": imported })),
        error: None,
    })
}

pub fn approve_join_request(
    app: &AppState,
    session: &SessionState,
    request_id: String,
) -> Result<ActionResult<()>, String> {
    admin_approve_join_request(app, session, request_id)
}

pub fn reject_join_request(
    app: &AppState,
    session: &SessionState,
    request_id: String,
) -> Result<ActionResult<()>, String> {
    admin_reject_join_request(app, session, request_id)
}
