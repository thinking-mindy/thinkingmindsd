use serde_json::Value;

use crate::admin::access::require_session_user;
use crate::admin::plans::{ensure_default_plans, find_plan_by_id, find_plan_by_slug};
use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::state::AppState;

pub fn get_plan(
    app: &AppState,
    session: &SessionState,
    plan_id: &str,
) -> Result<ActionResult<Value>, String> {
    let _user = require_session_user(app, session)?;
    let plans = ensure_default_plans(app)?;
    let plan = find_plan_by_id(&plans, plan_id).cloned();
    Ok(ActionResult {
        success: true,
        data: plan,
        error: None,
    })
}

pub fn get_plan_by_slug(
    app: &AppState,
    session: &SessionState,
    slug: &str,
) -> Result<ActionResult<Value>, String> {
    let _user = require_session_user(app, session)?;
    let plans = ensure_default_plans(app)?;
    let plan = find_plan_by_slug(&plans, slug).cloned();
    Ok(ActionResult {
        success: true,
        data: plan,
        error: None,
    })
}

pub fn get_all_plans(app: &AppState, session: &SessionState) -> Result<ActionResult<Vec<Value>>, String> {
    let _user = require_session_user(app, session)?;
    let plans = ensure_default_plans(app)?;
    Ok(ActionResult {
        success: true,
        data: Some(plans),
        error: None,
    })
}
