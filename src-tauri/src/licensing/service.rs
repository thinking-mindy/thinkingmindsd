use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use serde::Serialize;
use serde_json::{json, Map, Value};

use crate::db::crypto::{decrypt_payload, EncryptedEnvelope};

use crate::admin::access::{require_owner, require_session_user, resolve_company_id};
use crate::admin::plans::{ensure_default_plans, find_plan_by_id, find_plan_by_slug};
use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::orgs::service::{get_org_doc, persist_org, sync_local_org};
use crate::state::AppState;
use crate::store_util::{iso_now, ms_to_iso, now_ms, parse_iso_ms};

const DEFAULT_LICENSE_SYNC_URL: &str = "https://www.thinkingminds.co.zw/renew-licence";
const TRIAL_DAYS: i64 = 30;

const FREE_MODULES: &[&str] = &[
    "/",
    "/hr",
    "/inventory",
    "/finance",
    "/procurement",
    "/payroll",
    "/pos",
    "/cashier",
    "/school",
];

const PRO_MODULES: &[&str] = &["/it", "/helpdesk", "/crm", "/audit"];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseStatusDto {
    pub org_id: String,
    pub trial_started_at: Option<String>,
    pub license_expires_at: Option<String>,
    pub days_remaining: i64,
    pub is_expired: bool,
    pub is_in_trial: bool,
    pub plan_slug: String,
    pub tier: String,
    pub price_monthly: i64,
    pub currency: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModuleAccessResult {
    pub has_access: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan_slug: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license_expired: Option<bool>,
}

pub fn get_license_status(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
) -> Result<Option<LicenseStatusDto>, String> {
    let _user = require_session_user(app, session)?;
    ensure_trial_dates(app, org_id)?;
    let org = get_org_doc(app, org_id)?;
    let plans = ensure_default_plans(app)?;
    let plan = resolve_current_plan(&org, &plans);
    Ok(build_license_status(org_id, &org, plan.as_ref()))
}

pub fn get_license_status_for_current_user(
    app: &AppState,
    session: &SessionState,
) -> Result<Option<LicenseStatusDto>, String> {
    let user = require_session_user(app, session)?;
    let company_id = resolve_company_id(&user, app)?;
    get_license_status(app, session, &company_id)
}

pub fn extend_license(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
    expires_at: &str,
) -> Result<ActionResult<()>, String> {
    let owner = require_owner(app, session)?;
    if owner.company_id != org_id {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some("Organization not found".into()),
        });
    }
    let mut org = get_org_doc(app, org_id)?;
    if let Some(obj) = org.as_object_mut() {
        obj.insert("licenseExpiresAt".into(), json!(expires_at));
    }
    persist_org(app, org_id, &org)?;
    Ok(ActionResult {
        success: true,
        data: Some(()),
        error: None,
    })
}

pub fn sync_license_from_server(
    app: &AppState,
    session: &SessionState,
) -> Result<ActionResult<LicenseStatusDto>, String> {
    let owner = require_owner(app, session)?;
    let company_id = owner.company_id.clone();
    let company_name = owner
        .user
        .metadata
        .as_ref()
        .and_then(|m| m.get("companyName"))
        .and_then(|v| v.as_str())
        .map(str::to_string);

    let mut body = json!({
        "companyId": company_id,
        "orgId": company_id,
    });
    if let Some(name) = company_name.as_deref().filter(|n| !n.is_empty()) {
        body["companyName"] = json!(name);
    }

    let url = std::env::var("LICENSE_SYNC_URL")
        .or_else(|_| std::env::var("NEXT_PUBLIC_LICENSE_SYNC_URL"))
        .unwrap_or_else(|_| DEFAULT_LICENSE_SYNC_URL.to_string());

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&body)
        .send()
        .map_err(|e| format!("Licence server request failed: {e}"))?;

    let status_code = response.status();
    let response_body: Value = response
        .json()
        .map_err(|_| {
            if status_code.is_success() {
                "Licence server returned a non-JSON response".to_string()
            } else {
                format!("Licence server error ({status_code})")
            }
        })?;

    if !status_code.is_success() {
        let message = response_body
            .get("error")
            .or_else(|| response_body.get("message"))
            .and_then(|v| v.as_str())
            .unwrap_or(&format!("Licence server returned {status_code}"))
            .to_string();
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some(message),
        });
    }

    let parsed = parse_license_sync_response(&response_body)?;
    let Some(license_expires_at) = parsed.license_expires_at else {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some(
                parsed
                    .error
                    .unwrap_or_else(|| "Failed to parse licence server response".into()),
            ),
        });
    };

    let mut org = match get_org_doc(app, &company_id) {
        Ok(o) => o,
        Err(_) => {
            sync_local_org(
                app,
                &owner.user,
                &company_id,
                company_name.as_deref(),
                Some(owner.user.email.as_str()),
                None,
                None,
            )?;
            get_org_doc(app, &company_id)?
        }
    };

    let existing_trial = read_license_date_field(&org, "trialStartedAt");
    let trial_started_at = parsed
        .trial_started_at
        .or(existing_trial)
        .or_else(|| read_license_date_field(&org, "createdAt"))
        .unwrap_or_else(iso_now);

    let mut patch = Map::new();
    patch.insert("trialStartedAt".into(), json!(trial_started_at));
    patch.insert("licenseExpiresAt".into(), json!(license_expires_at));
    patch.insert("licenseSyncedAt".into(), json!(iso_now()));

    if let Some(tier) = parsed.billing_tier {
        patch.insert("billingTier".into(), json!(tier));
    }
    if let Some(status) = parsed.billing_status {
        patch.insert("billingStatus".into(), json!(status));
    }
    if let Some(plan_id) = parsed.plan_id {
        patch.insert("planId".into(), json!(plan_id));
    } else if let Some(slug) = parsed.plan_slug.as_deref() {
        let plans = ensure_default_plans(app)?;
        if let Some(plan) = find_plan_by_slug(&plans, slug) {
            if let Some(id) = crate::admin::access::doc_id(plan) {
                patch.insert("planId".into(), json!(id));
            }
        }
    }
    if let Some(name) = parsed.company_name {
        if is_placeholder_org_name(org.get("name")) {
            patch.insert("name".into(), json!(name));
        }
    }

    if let Some(obj) = org.as_object_mut() {
        for (k, v) in patch {
            obj.insert(k, v);
        }
    }
    persist_org(app, &company_id, &org)?;

    let registered_at = parsed
        .registered_at
        .unwrap_or_else(|| trial_started_at.clone());
    save_license_anchor(app, &company_id, &registered_at)?;

    let status = get_license_status(app, session, &company_id)?;
    let Some(dto) = status else {
        return Ok(ActionResult {
            success: false,
            data: None,
            error: Some("Licence saved but status could not be computed".into()),
        });
    };

    Ok(ActionResult {
        success: true,
        data: Some(dto),
        error: None,
    })
}

pub fn refresh_license_from_remote(
    app: &AppState,
    session: &SessionState,
) -> Result<ActionResult<LicenseStatusDto>, String> {
    let _user = require_session_user(app, session)?;
    Ok(ActionResult {
        success: false,
        data: None,
        error: Some(
            "Remote license sync is not configured (desktop uses local licence data only).".into(),
        ),
    })
}

pub fn has_module_access(
    app: &AppState,
    session: &SessionState,
    module_path: &str,
) -> Result<ModuleAccessResult, String> {
    let user = require_session_user(app, session)?;
    let company_id = match resolve_company_id(&user, app) {
        Ok(id) => id,
        Err(_) => {
            return Ok(ModuleAccessResult {
                has_access: false,
                plan_slug: None,
                plan_name: None,
                license_expired: None,
            });
        }
    };

    let org = match get_org_doc(app, &company_id) {
        Ok(o) => o,
        Err(_) => {
            return Ok(ModuleAccessResult {
                has_access: false,
                plan_slug: None,
                plan_name: None,
                license_expired: None,
            });
        }
    };

    let plans = ensure_default_plans(app)?;
    let plan = resolve_current_plan(&org, &plans);
    let plan_slug = plan
        .as_ref()
        .and_then(|p| p.get("slug"))
        .and_then(|v| v.as_str())
        .unwrap_or("free")
        .to_string();
    let plan_name = plan
        .as_ref()
        .and_then(|p| p.get("name"))
        .and_then(|v| v.as_str())
        .unwrap_or("Free Trial")
        .to_string();

    let license_status = get_license_status(app, session, &company_id)?;
    if license_status.as_ref().map(|s| s.is_expired).unwrap_or(false) {
        return Ok(ModuleAccessResult {
            has_access: false,
            plan_slug: Some(plan_slug),
            plan_name: Some(plan_name),
            license_expired: Some(true),
        });
    }

    let trial_unlocks_all = license_status
        .as_ref()
        .map(|s| s.is_in_trial && !s.is_expired)
        .unwrap_or(false)
        || (plan_slug == "free" && !license_status.as_ref().map(|s| s.is_expired).unwrap_or(true));

    if trial_unlocks_all {
        return Ok(ModuleAccessResult {
            has_access: true,
            plan_slug: Some(plan_slug),
            plan_name: Some(plan_name),
            license_expired: None,
        });
    }

    if FREE_MODULES.contains(&module_path) {
        return Ok(ModuleAccessResult {
            has_access: true,
            plan_slug: Some(plan_slug),
            plan_name: Some(plan_name),
            license_expired: None,
        });
    }

    if PRO_MODULES.contains(&module_path) {
        let allowed = plan_slug == "pro" || plan_slug == "enterprise";
        return Ok(ModuleAccessResult {
            has_access: allowed,
            plan_slug: Some(plan_slug),
            plan_name: Some(plan_name),
            license_expired: None,
        });
    }

    Ok(ModuleAccessResult {
        has_access: false,
        plan_slug: Some(plan_slug),
        plan_name: Some(plan_name),
        license_expired: None,
    })
}

pub fn build_license_status(
    company_id: &str,
    org: &Value,
    plan: Option<&Value>,
) -> Option<LicenseStatusDto> {
    let trial = read_license_date_field(org, "trialStartedAt");
    let expiry = read_license_date_field(org, "licenseExpiresAt").or_else(|| {
        trial.as_ref().map(|start| {
            let ms = parse_iso_ms(start).unwrap_or(now_ms()) + TRIAL_DAYS * 86400 * 1000;
            ms_to_iso(ms)
        })
    });
    let expiry_ms = expiry.as_ref().and_then(|s| parse_iso_ms(s)).unwrap_or(now_ms());
    let now = now_ms();
    let diff = expiry_ms - now;
    let is_expired = diff <= 0;
    let days_remaining = if is_expired {
        0
    } else {
        ((diff as f64) / 86_400_000.0).ceil() as i64
    };
    let plan_slug = plan
        .and_then(|p| p.get("slug"))
        .and_then(|v| v.as_str())
        .unwrap_or("free")
        .to_string();
    let tier = resolve_billing_tier(org);
    let price = match tier.as_str() {
        "vendor" => 5,
        "shop_owner" => 20,
        _ => 149,
    };

    Some(LicenseStatusDto {
        org_id: company_id.to_string(),
        trial_started_at: trial,
        license_expires_at: expiry,
        days_remaining,
        is_expired,
        is_in_trial: plan_slug == "free",
        plan_slug,
        tier,
        price_monthly: price,
        currency: "USD",
    })
}

fn ensure_trial_dates(app: &AppState, org_id: &str) -> Result<(), String> {
    let org = get_org_doc(app, org_id)?;
    let trial = read_license_date_field(&org, "trialStartedAt");
    let expiry = read_license_date_field(&org, "licenseExpiresAt");
    let billing_tier = org
        .get("billingTier")
        .and_then(|v| v.as_str())
        .map(str::to_string);

    if has_usable_license_dates(&org, &trial, &expiry, billing_tier.as_deref()) {
        return Ok(());
    }

    let trial_started_at = trial
        .or_else(|| read_license_date_field(&org, "createdAt"))
        .unwrap_or_else(iso_now);
    let license_expires_at = expiry.unwrap_or_else(|| {
        let base_ms = parse_iso_ms(&trial_started_at).unwrap_or(now_ms());
        ms_to_iso(base_ms + TRIAL_DAYS * 86400 * 1000)
    });
    let billing_tier = billing_tier.unwrap_or_else(|| "company".to_string());

    let mut org = org;
    if let Some(obj) = org.as_object_mut() {
        obj.insert("trialStartedAt".into(), json!(trial_started_at));
        obj.insert("licenseExpiresAt".into(), json!(license_expires_at));
        obj.insert("billingTier".into(), json!(billing_tier.as_str()));
    }
    persist_org(app, org_id, &org)?;
    Ok(())
}

struct ParsedSyncResponse {
    ok: bool,
    error: Option<String>,
    trial_started_at: Option<String>,
    license_expires_at: Option<String>,
    registered_at: Option<String>,
    plan_slug: Option<String>,
    plan_id: Option<String>,
    billing_tier: Option<String>,
    billing_status: Option<String>,
    company_name: Option<String>,
}

fn parse_license_sync_response(body: &Value) -> Result<ParsedSyncResponse, String> {
    if !body.is_object() {
        return Ok(ParsedSyncResponse {
            ok: false,
            error: Some("Invalid response from licence server".into()),
            trial_started_at: None,
            license_expires_at: None,
            registered_at: None,
            plan_slug: None,
            plan_id: None,
            billing_tier: None,
            billing_status: None,
            company_name: None,
        });
    }

    if body.get("success").and_then(|v| v.as_bool()) == Some(false) {
        let error = body
            .get("error")
            .or_else(|| body.get("message"))
            .and_then(|v| v.as_str())
            .unwrap_or("Licence sync was rejected")
            .to_string();
        return Ok(ParsedSyncResponse {
            ok: false,
            error: Some(error),
            trial_started_at: None,
            license_expires_at: None,
            registered_at: None,
            plan_slug: None,
            plan_id: None,
            billing_tier: None,
            billing_status: None,
            company_name: None,
        });
    }

    let license_expires_at = body
        .get("licenseExpiresAt")
        .or_else(|| body.get("expiresAt"))
        .or_else(|| body.get("expiryDate"))
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(str::to_string);

    if license_expires_at.is_none() {
        return Ok(ParsedSyncResponse {
            ok: false,
            error: Some(
                "Licence server did not return an expiry date (licenseExpiresAt)".into(),
            ),
            trial_started_at: None,
            license_expires_at: None,
            registered_at: None,
            plan_slug: None,
            plan_id: None,
            billing_tier: None,
            billing_status: None,
            company_name: None,
        });
    }

    Ok(ParsedSyncResponse {
        ok: true,
        error: None,
        trial_started_at: body
            .get("trialStartedAt")
            .and_then(|v| v.as_str())
            .map(str::to_string),
        license_expires_at,
        registered_at: body
            .get("registeredAt")
            .or_else(|| body.get("trialStartedAt"))
            .and_then(|v| v.as_str())
            .map(str::to_string),
        plan_slug: body.get("planSlug").and_then(|v| v.as_str()).map(str::to_string),
        plan_id: body.get("planId").and_then(|v| v.as_str()).map(str::to_string),
        billing_tier: body
            .get("billingTier")
            .and_then(|v| v.as_str())
            .map(str::to_string),
        billing_status: body
            .get("billingStatus")
            .and_then(|v| v.as_str())
            .map(str::to_string),
        company_name: body
            .get("companyName")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(str::to_string),
    })
}

fn resolve_current_plan(org: &Value, plans: &[Value]) -> Option<Value> {
    if let Some(plan_id) = org.get("planId").and_then(|v| {
        v.as_str()
            .map(str::to_string)
            .or_else(|| v.as_i64().map(|n| n.to_string()))
    }) {
        if let Some(plan) = find_plan_by_id(plans, &plan_id) {
            return Some(plan.clone());
        }
    }
    find_plan_by_slug(plans, "free").cloned()
}

fn resolve_billing_tier(org: &Value) -> String {
    let raw = org
        .get("billingTier")
        .or_else(|| org.get("orgType"))
        .or_else(|| org.get("companyType"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_lowercase();
    if raw == "vendor" {
        "vendor".into()
    } else if raw == "shop_owner" || raw == "shop-owner" || raw == "shopowner" || raw == "shopkeeper"
    {
        "shop_owner".into()
    } else {
        "company".into()
    }
}

fn is_placeholder_org_name(name: Option<&Value>) -> bool {
    let value = name
        .and_then(|v| v.as_str())
        .map(str::trim)
        .unwrap_or("")
        .to_lowercase();
    value.is_empty() || value == "company" || value == "offline company"
}

fn save_license_anchor(app: &AppState, org_id: &str, registered_at: &str) -> Result<(), String> {
    let path = anchor_path(app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut map: HashMap<String, Value> = if path.exists() {
        let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&raw).unwrap_or_default()
    } else {
        HashMap::new()
    };
    map.insert(
        org_id.to_string(),
        json!({ "registeredAt": registered_at }),
    );
    let content = serde_json::to_string_pretty(&map).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

fn anchor_path(app: &AppState) -> PathBuf {
    app.secrets_dir().join("license-anchor.json")
}

fn has_usable_license_dates(
    org: &Value,
    trial: &Option<String>,
    expiry: &Option<String>,
    billing_tier: Option<&str>,
) -> bool {
    billing_tier.is_some()
        && trial
            .as_ref()
            .and_then(|s| parse_iso_ms(s))
            .is_some()
        && expiry
            .as_ref()
            .and_then(|s| parse_iso_ms(s))
            .is_some()
        && org.get("billingTier").and_then(|v| v.as_str()).is_some()
}

fn license_date_context(key: &str) -> Option<&'static str> {
    match key {
        "trialStartedAt" => Some("license-field:trialStartedAt"),
        "licenseExpiresAt" => Some("license-field:licenseExpiresAt"),
        _ => None,
    }
}

fn decrypt_license_date_value(key: &str, value: &str) -> Option<String> {
    const PREFIX: &str = "enc:";
    if !value.starts_with(PREFIX) {
        return parse_iso_ms(value).map(|_| value.to_string());
    }
    let context = license_date_context(key)?;
    let packed = &value[PREFIX.len()..];
    let json_bytes = URL_SAFE_NO_PAD.decode(packed).ok()?;
    let envelope: EncryptedEnvelope = serde_json::from_slice(&json_bytes).ok()?;
    let iso = decrypt_payload(&envelope, context).ok()?;
    parse_iso_ms(&iso).map(|_| iso)
}

fn read_license_date_field(org: &Value, key: &str) -> Option<String> {
    org.get(key).and_then(|v| {
        if let Some(s) = v.as_str() {
            return decrypt_license_date_value(key, s);
        }
        None
    })
}

fn iso_expiry_days(days: i64) -> String {
    ms_to_iso(now_ms() + days * 86400 * 1000)
}
