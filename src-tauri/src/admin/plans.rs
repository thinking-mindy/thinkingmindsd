use serde_json::{json, Value};

use crate::db::{self, store};
use crate::state::AppState;

pub fn ensure_default_plans(app: &AppState) -> Result<Vec<Value>, String> {
    let mut plans = store::read_collection(&app.db_dir(), db::DB_NAME, "plans")?;
    let defaults: Vec<Value> = vec![
        json!({
            "slug": "free",
            "name": "Free Plan",
            "description": "Essential core modules for emerging teams.",
            "priceMonthly": 0,
            "supportLevel": "community",
            "customizable": false,
            "apiLimitMonthly": 1000,
            "features": [
                "POS (Point of Sale)",
                "Finance & Accounting",
                "Inventory Management",
                "Procurement",
                "HR & Payroll"
            ]
        }),
        json!({
            "slug": "pro",
            "name": "Pro Plan",
            "description": "Full Thinking Minds platform with advanced automation.",
            "priceMonthly": 199,
            "supportLevel": "priority",
            "customizable": true,
            "apiLimitMonthly": 50000,
            "features": ["All core modules & features", "Unlimited team members", "Priority support"]
        }),
        json!({
            "slug": "enterprise",
            "name": "Customized Plan",
            "description": "Fully customized enterprise solution.",
            "priceMonthly": 0,
            "supportLevel": "dedicated",
            "customizable": true,
            "apiLimitMonthly": 1000000,
            "features": ["All Pro features included", "Dedicated support team"]
        }),
    ];

    let mut changed = false;
    for default in defaults {
        let slug = default.get("slug").and_then(|v| v.as_str()).unwrap_or("");
        let exists = plans.iter().any(|p| p.get("slug").and_then(|v| v.as_str()) == Some(slug));
        if !exists {
            let mut plan = default;
            if let Some(obj) = plan.as_object_mut() {
                obj.insert("_id".into(), json!(crate::admin::make_id()));
            }
            plans.push(plan);
            changed = true;
        }
    }

    if changed {
        store::write_collection(&app.db_dir(), db::DB_NAME, "plans", &plans)?;
    }

    plans.sort_by(|a, b| {
        let ap = a.get("priceMonthly").and_then(|v| v.as_i64()).unwrap_or(0);
        let bp = b.get("priceMonthly").and_then(|v| v.as_i64()).unwrap_or(0);
        ap.cmp(&bp)
    });

    Ok(plans)
}

pub fn find_plan_by_id<'a>(plans: &'a [Value], plan_id: &str) -> Option<&'a Value> {
    plans.iter().find(|p| super::access::doc_id(p).as_deref() == Some(plan_id))
}

pub fn find_plan_by_slug<'a>(plans: &'a [Value], slug: &str) -> Option<&'a Value> {
    plans.iter().find(|p| p.get("slug").and_then(|v| v.as_str()) == Some(slug))
}

pub fn assign_free_plan_if_missing(app: &AppState, org: &mut Value) -> Result<(), String> {
    if org.get("planId").and_then(|v| v.as_str()).filter(|s| !s.is_empty()).is_some() {
        return Ok(());
    }
    let plans = ensure_default_plans(app)?;
    if let Some(free) = find_plan_by_slug(&plans, "free") {
        if let Some(id) = super::access::doc_id(free) {
            if let Some(obj) = org.as_object_mut() {
                obj.insert("planId".into(), json!(id));
            }
        }
    }
    Ok(())
}
