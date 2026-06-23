use serde_json::{json, Value};

use crate::admin::access::{member_belongs_to_company, require_owner, session_org};
use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::db::{self, store};
use crate::state::AppState;

pub fn get_members(app: &AppState, session: &SessionState) -> Result<ActionResult<Vec<Value>>, String> {
    let (_user, company_id) = session_org(app, session)?;
    let accounts = store::read_collection(&app.db_dir(), db::DB_NAME, "users")?;
    let filtered: Vec<Value> = accounts
        .iter()
        .filter(|m| member_belongs_to_company(m, &company_id))
        .cloned()
        .collect();

    Ok(ActionResult {
        success: true,
        data: Some(enrich_members(filtered)),
        error: None,
    })
}

pub fn update_user_allowed_modules(
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
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some("Cannot update modules for user in another organization".into()),
        });
    }

    let modules: Vec<String> = allowed_modules
        .into_iter()
        .map(|m| m.trim().to_string())
        .filter(|m| !m.is_empty())
        .collect();

    if let Some(obj) = accounts[idx].as_object_mut() {
        let modules_json = json!(modules);
        obj.insert("public_metadata".into(), json!({ "allowedModules": modules_json.clone() }));
        obj.insert("publicMetadata".into(), json!({ "allowedModules": modules_json }));
    }
    store::write_collection(&app.db_dir(), db::DB_NAME, "users", &accounts)?;

    Ok(ActionResult {
        success: true,
        data: Some(()),
        error: None,
    })
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
