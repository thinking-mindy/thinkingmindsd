use serde::Deserialize;
use serde_json::{json, Value};

use crate::admin::access::{org_id_matches, require_owner, session_org};
use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::db::{self, store};
use crate::store_util::iso_now;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitiatePlanPaymentInput {
    pub org_id: String,
    pub plan_id: Option<String>,
    pub plan_name: Option<String>,
    pub amount: f64,
    pub currency: Option<String>,
    pub msisdn: Option<String>,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitiatePosPaynowPaymentInput {
    pub org_id: String,
    pub amount: f64,
    pub msisdn: Option<String>,
    pub method: Option<String>,
}

pub fn get_payments_for_org(
    app: &AppState,
    session: &SessionState,
    org_id: String,
) -> Result<ActionResult<Vec<Value>>, String> {
    let _ctx = require_owner(app, session)?;
    let mut rows = read_org_payments(app, &org_id)?;
    rows.sort_by(|a, b| {
        let at = a.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
        let bt = b.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
        bt.cmp(at)
    });
    Ok(ActionResult {
        success: true,
        data: Some(rows),
        error: None,
    })
}

pub fn get_payments_for_current_org(
    app: &AppState,
    session: &SessionState,
) -> Result<ActionResult<Vec<Value>>, String> {
    let (_user, company_id) = session_org(app, session)?;
    let mut rows = read_org_payments(app, &company_id)?;
    rows.sort_by(|a, b| {
        let at = a.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
        let bt = b.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
        bt.cmp(at)
    });
    Ok(ActionResult {
        success: true,
        data: Some(rows),
        error: None,
    })
}

pub fn initiate_plan_payment(
    app: &AppState,
    session: &SessionState,
    input: InitiatePlanPaymentInput,
) -> Result<ActionResult<Value>, String> {
    let ctx = require_owner(app, session)?;
    if ctx.company_id != input.org_id {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some("Cannot initiate payment for another organization".into()),
        });
    }

    if std::env::var("PAYNOW_INTEGRATION_ID")
        .ok()
        .map(|v| v.trim().is_empty())
        .unwrap_or(true)
    {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some(
                "PayNow is not configured for desktop (optional — use cash/card).".into(),
            ),
        });
    }

    let mut payments = store::read_collection(&app.db_dir(), db::DB_NAME, "plan_payments").unwrap_or_default();
    let payment_id = crate::auth::models::make_object_id();
    let now = iso_now();
    let payment = json!({
        "_id": payment_id,
        "orgId": input.org_id,
        "planId": input.plan_id,
        "planName": input.plan_name,
        "amount": input.amount,
        "currency": input.currency.unwrap_or_else(|| "USD".into()),
        "msisdn": input.msisdn,
        "reason": input.reason.unwrap_or_else(|| "Plan Upgrade".into()),
        "status": "pending",
        "sourceReference": crate::auth::models::make_object_id(),
        "pollUrl": format!("stub://paynow/poll/{payment_id}"),
        "createdBy": ctx.user.id,
        "createdAt": now,
        "updatedAt": now,
    });
    payments.push(payment.clone());
    store::write_collection(&app.db_dir(), db::DB_NAME, "plan_payments", &payments)?;

    Ok(ActionResult {
        success: true,
        data: Some(payment),
        error: None,
    })
}

pub fn check_plan_payment_status(
    app: &AppState,
    session: &SessionState,
    payment_id: String,
) -> Result<ActionResult<Value>, String> {
    let (_user, company_id) = session_org(app, session)?;
    let mut payments = store::read_collection(&app.db_dir(), db::DB_NAME, "plan_payments").unwrap_or_default();
    let idx = crate::admin::access::find_doc_index(&payments, &payment_id)
        .ok_or_else(|| "Payment not found".to_string())?;
    if !org_id_matches(&payments[idx], &company_id) {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some("Unauthorized".into()),
        });
    }

    let status = payments[idx]
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("pending");
    if status == "pending" {
        if let Some(obj) = payments[idx].as_object_mut() {
            obj.insert("status".into(), json!("processing"));
            obj.insert("updatedAt".into(), json!(iso_now()));
        }
        let updated = payments[idx].clone();
        store::write_collection(&app.db_dir(), db::DB_NAME, "plan_payments", &payments)?;
        return Ok(ActionResult {
            success: true,
            data: Some(json!({
                "status": "processing",
                "paid": false,
                "response": updated.get("pollUrl").cloned().unwrap_or(Value::Null)
            })),
            error: None,
        });
    }

    Ok(ActionResult {
        success: true,
        data: Some(json!({
            "status": status,
            "paid": status == "completed",
            "response": payments[idx].get("pollUrl").cloned().unwrap_or(Value::Null)
        })),
        error: None,
    })
}

pub fn initiate_pos_paynow_payment(
    app: &AppState,
    session: &SessionState,
    input: InitiatePosPaynowPaymentInput,
) -> Result<ActionResult<Value>, String> {
    let plan_input = InitiatePlanPaymentInput {
        org_id: input.org_id,
        plan_id: None,
        plan_name: Some(format!(
            "POS payment ({})",
            input.method.unwrap_or_else(|| "ecocash".into())
        )),
        amount: input.amount,
        currency: Some("USD".into()),
        msisdn: input.msisdn,
        reason: Some("POS sale".into()),
    };
    initiate_plan_payment(app, session, plan_input)
}

fn read_org_payments(app: &AppState, company_id: &str) -> Result<Vec<Value>, String> {
    let payments = store::read_collection(&app.db_dir(), db::DB_NAME, "plan_payments").unwrap_or_default();
    let mut rows: Vec<Value> = payments
        .into_iter()
        .filter(|p| org_id_matches(p, company_id))
        .collect();
    if rows.is_empty() {
        let fallback = store::read_collection(&app.db_dir(), db::DB_NAME, "payments").unwrap_or_default();
        rows = fallback
            .into_iter()
            .filter(|p| org_id_matches(p, company_id))
            .collect();
    }
    Ok(rows)
}
