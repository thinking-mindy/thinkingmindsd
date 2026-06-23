use serde_json::{json, Value};

use crate::admin::access::{require_owner, session_org};
use crate::admin::service::{admin_update_org, ActionResult};
use crate::auth::session::SessionState;
use crate::orgs::service::{get_org_doc, persist_org};
use crate::state::AppState;
use crate::store_util::{action_err, action_ok};

pub fn get_receipt_design_for_current_org(app: &AppState, session: &SessionState) -> ActionResult<Value> {
    let (_, company_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(_) => return action_ok(Value::Null),
    };
    let org = match get_org_doc(app, &company_id) {
        Ok(v) => v,
        Err(_) => return action_ok(Value::Null),
    };
    action_ok(build_receipt_design_config(&org))
}

pub fn update_receipt_design_for_current_org(
    app: &AppState,
    session: &SessionState,
    settings: Value,
) -> ActionResult<Value> {
    let owner_ctx = match require_owner(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let normalized = merge_receipt_design_settings(settings);
    let patch = json!({
        "receiptDesignSettings": normalized
    });

    let mut updated_with_admin = false;
    if let Ok(res) = admin_update_org(app, session, owner_ctx.company_id.clone(), patch.clone()) {
        if res.success {
            updated_with_admin = true;
        }
    }

    if !updated_with_admin {
        let mut org = match get_org_doc(app, &owner_ctx.company_id) {
            Ok(v) => v,
            Err(e) => return action_err(e),
        };
        if let Some(obj) = org.as_object_mut() {
            obj.insert("receiptDesignSettings".into(), normalized.clone());
        }
        if let Err(e) = persist_org(app, &owner_ctx.company_id, &org) {
            return action_err(e);
        }
    }

    let org = match get_org_doc(app, &owner_ctx.company_id) {
        Ok(v) => v,
        Err(_) => {
            return action_ok(json!({
                "settings": normalized,
                "branding": build_receipt_branding(&Value::Null)
            }))
        }
    };
    action_ok(build_receipt_design_config(&org))
}

fn merge_receipt_design_settings(stored: Value) -> Value {
    let mut defaults = default_receipt_settings();
    if let (Some(def), Some(stored_obj)) = (defaults.as_object_mut(), stored.as_object()) {
        for (k, v) in stored_obj {
            if def.contains_key(k) {
                def.insert(k.clone(), v.clone());
            }
        }
    }
    defaults
}

fn build_receipt_design_config(org: &Value) -> Value {
    let settings = merge_receipt_design_settings(
        org.get("receiptDesignSettings").cloned().unwrap_or_else(|| json!({})),
    );
    json!({
        "settings": settings,
        "branding": build_receipt_branding(org),
    })
}

fn build_receipt_branding(org: &Value) -> Value {
    let org_settings = org.get("orgSettings").cloned().unwrap_or_else(|| json!({}));
    json!({
        "companyName": org.get("name").and_then(|v| v.as_str()).map(str::trim).filter(|s| !s.is_empty()).unwrap_or("Thinking Minds"),
        "logoUrl": org.get("logoUrl").and_then(|v| v.as_str()).map(str::trim).filter(|s| !s.is_empty()).unwrap_or("/logo.png"),
        "tagline": org_settings.get("tagline").and_then(|v| v.as_str()).map(str::trim).filter(|s| !s.is_empty()).unwrap_or("...thinking in terms of lifetimes"),
        "phone": org_settings.get("phone").and_then(|v| v.as_str()).map(str::trim).filter(|s| !s.is_empty()),
        "email": org.get("email").and_then(|v| v.as_str()).map(str::trim).filter(|s| !s.is_empty()),
        "address": org.get("address").and_then(|v| v.as_str()).map(str::trim).filter(|s| !s.is_empty()),
        "footerText": org_settings.get("receiptFooter").and_then(|v| v.as_str()).map(str::trim).filter(|s| !s.is_empty()).unwrap_or("Thank you!")
    })
}

fn default_receipt_settings() -> Value {
    json!({
        "showLogo": true,
        "showCompanyName": true,
        "showTagline": true,
        "showPhone": true,
        "showEmail": false,
        "showAddress": false,
        "showTable": true,
        "showReceiptId": true,
        "showDate": true,
        "showSubtotal": true,
        "showTax": true,
        "showPaidAmount": true,
        "showChange": true,
        "showPaymentReference": true,
        "showPaynowNumber": true,
        "showCardReference": true,
        "showPaymentMethod": true,
        "showQrCode": true,
        "showFooterMessage": true
    })
}
