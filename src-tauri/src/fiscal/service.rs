use serde::Serialize;
use serde_json::{json, Map, Value};

use crate::admin::access::session_org;
use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::db::{self, store};
use crate::fiscal::client::{
    fdms_close_day, fdms_get_config, fdms_get_status, fdms_open_day, fdms_ping, fdms_submit_receipt,
    fdms_verify_taxpayer, FdmsCredentials,
};
use crate::fiscal::connectivity::{
    is_fdms_connectivity_error, FISCAL_OFFLINE_CREDIT_NOTE_MESSAGE, FISCAL_OFFLINE_MESSAGE,
};
use crate::fiscal::constants::{
    DEFAULT_DEVICE_MODEL_NAME, DEFAULT_DEVICE_MODEL_VERSION, FDMS_PROD_QR, FDMS_TEST_QR,
    POS_ORDERS, SETTINGS_COL, STATE_COL,
};
use crate::fiscal::fiscal_day::{
    accumulate_credit_note_counters, accumulate_sale_counters, build_close_day_payload,
    counters_from_json, counters_to_json, fiscal_day_date_from_opened_at,
};
use crate::fiscal::receipt::{
    build_fiscal_receipt, CreditDebitNoteRef, PosFiscalLineItem, PosFiscalPayment,
};
use crate::fiscal::register::register_zimra_device;
use crate::fiscal::signature::{
    build_receipt_qr_url, format_verification_code, receipt_qr_data_from_signature,
};
use crate::state::AppState;
use crate::store_util::{action_err, action_ok, find_org_doc_by_field, iso_now, update_doc_by_id};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FiscalFlexibleResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub skipped: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub warning: Option<String>,
}

fn fiscal_ok(data: Value) -> FiscalFlexibleResult {
    FiscalFlexibleResult {
        success: true,
        data: Some(data),
        error: None,
        skipped: None,
        warning: None,
    }
}

fn fiscal_ok_null() -> FiscalFlexibleResult {
    FiscalFlexibleResult {
        success: true,
        data: None,
        error: None,
        skipped: None,
        warning: None,
    }
}

fn fiscal_skipped(warning: &str) -> FiscalFlexibleResult {
    FiscalFlexibleResult {
        success: true,
        data: None,
        error: None,
        skipped: Some(true),
        warning: Some(warning.to_string()),
    }
}

fn fiscal_err(error: impl Into<String>) -> FiscalFlexibleResult {
    FiscalFlexibleResult {
        success: false,
        data: None,
        error: Some(error.into()),
        skipped: None,
        warning: None,
    }
}

fn creds_from_settings(settings: &Value) -> Result<FdmsCredentials, String> {
    Ok(FdmsCredentials {
        certificate_pem: settings
            .get("certificatePem")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        private_key_pem: settings
            .get("privateKeyPem")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        device_model_name: settings
            .get("deviceModelName")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        device_model_version: settings
            .get("deviceModelVersion")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
    })
}

fn default_state(org_id: &str) -> Value {
    json!({
        "orgId": org_id,
        "fiscalDayNo": 0,
        "fiscalDayStatus": "FiscalDayClosed",
        "receiptCounter": 0,
        "receiptGlobalNo": 0,
        "fiscalDayCounters": [],
        "updatedAt": iso_now(),
    })
}

fn load_settings(app: &AppState, org_id: &str) -> Result<Option<Value>, String> {
    let docs = store::read_collection(&app.db_dir(), db::DB_NAME, SETTINGS_COL)?;
    Ok(docs.into_iter().find(|d| {
        d.get("orgId")
            .and_then(|v| v.as_str())
            .map(|s| s == org_id)
            .unwrap_or(false)
    }))
}

fn load_state(app: &AppState, org_id: &str) -> Result<Value, String> {
    let docs = store::read_collection(&app.db_dir(), db::DB_NAME, STATE_COL)?;
    Ok(docs
        .into_iter()
        .find(|d| {
            d.get("orgId")
                .and_then(|v| v.as_str())
                .map(|s| s == org_id)
                .unwrap_or(false)
        })
        .unwrap_or_else(|| default_state(org_id)))
}

fn upsert_org_doc(app: &AppState, collection: &str, org_id: &str, patch: Map<String, Value>) -> Result<(), String> {
    let mut docs = store::read_collection(&app.db_dir(), db::DB_NAME, collection)?;
    if let Some(idx) = docs.iter().position(|d| {
        d.get("orgId")
            .and_then(|v| v.as_str())
            .map(|s| s == org_id)
            .unwrap_or(false)
    }) {
        if let Some(obj) = docs[idx].as_object_mut() {
            for (k, v) in patch {
                obj.insert(k, v);
            }
        }
    } else {
        let mut doc = patch;
        doc.insert("orgId".into(), json!(org_id));
        docs.push(Value::Object(doc));
    }
    store::write_collection(&app.db_dir(), db::DB_NAME, collection, &docs)
}

fn save_state(app: &AppState, state: &Value) -> Result<(), String> {
    let org_id = state
        .get("orgId")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing orgId in fiscal state".to_string())?;
    let patch = state
        .as_object()
        .cloned()
        .ok_or_else(|| "Invalid fiscal state".to_string())?;
    upsert_org_doc(app, STATE_COL, org_id, patch)
}

fn attach_fiscal_to_pos_order(app: &AppState, order_id: &str, fiscal: Value) -> Result<(), String> {
    let mut patch = Map::new();
    patch.insert("fiscal".into(), fiscal);
    patch.insert("fiscalisedAt".into(), json!(iso_now()));
    update_doc_by_id(app, POS_ORDERS, order_id, patch)?;
    Ok(())
}

fn submit_fiscal_receipt(
    app: &AppState,
    settings: &Value,
    state: &Value,
    device_id: i64,
    private_key_pem: &str,
    invoice_no: &str,
    receipt_currency: &str,
    tax_inclusive: bool,
    items: &[PosFiscalLineItem],
    payments: &[PosFiscalPayment],
    applicable_taxes: Option<&[Value]>,
    previous_receipt_hash: Option<&str>,
    receipt_type: &str,
    receipt_notes: Option<&str>,
    credit_debit_note: Option<&CreditDebitNoteRef>,
) -> Result<(Value, Value), String> {
    let receipt_counter = state
        .get("receiptCounter")
        .and_then(|v| v.as_i64())
        .unwrap_or(0)
        + 1;
    let receipt_global_no = state
        .get("receiptGlobalNo")
        .and_then(|v| v.as_i64())
        .unwrap_or(0)
        + 1;

    let built = build_fiscal_receipt(
        device_id,
        private_key_pem,
        receipt_counter,
        receipt_global_no,
        invoice_no,
        receipt_currency,
        tax_inclusive,
        items,
        payments,
        applicable_taxes,
        previous_receipt_hash,
        None,
        Some(receipt_type),
        receipt_notes,
        credit_debit_note,
    )?;

    let environment = settings
        .get("environment")
        .and_then(|v| v.as_str())
        .unwrap_or("test");
    let creds = creds_from_settings(settings)?;
    let response = fdms_submit_receipt(
        environment,
        device_id,
        &creds,
        built.receipt.clone(),
    )?;

    let receipt_id = response
        .get("receiptID")
        .or_else(|| response.get("receiptId"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let qr_url = settings
        .get("qrUrl")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            if environment == "production" {
                FDMS_PROD_QR.to_string()
            } else {
                FDMS_TEST_QR.to_string()
            }
        });
    let qr_code_url = build_receipt_qr_url(
        &qr_url,
        device_id,
        &built.receipt_date,
        receipt_global_no,
        &built.receipt_signature,
    )?;
    let qr_data = receipt_qr_data_from_signature(&built.receipt_signature)?;

    let is_credit = receipt_type == "CREDITNOTE";
    let existing_counters = state
        .get("fiscalDayCounters")
        .and_then(|v| v.as_array())
        .map(|a| counters_from_json(a))
        .unwrap_or_default();
    let fiscal_day_counters = if is_credit {
        accumulate_credit_note_counters(
            &existing_counters,
            receipt_currency,
            &built.receipt_taxes,
            &built.receipt_payments,
        )
    } else {
        accumulate_sale_counters(
            &existing_counters,
            receipt_currency,
            &built.receipt_taxes,
            &built.receipt_payments,
        )
    };

    let mut next_state = state.clone();
    if let Some(obj) = next_state.as_object_mut() {
        obj.insert("receiptCounter".into(), json!(receipt_counter));
        obj.insert("receiptGlobalNo".into(), json!(receipt_global_no));
        obj.insert("previousReceiptHash".into(), json!(built.receipt_hash));
        if receipt_id > 0 {
            obj.insert("lastReceiptId".into(), json!(receipt_id));
        }
        obj.insert(
            "fiscalDayCounters".into(),
            json!(counters_to_json(&fiscal_day_counters)),
        );
        obj.insert("updatedAt".into(), json!(iso_now()));
    }
    save_state(app, &next_state)?;

    let fiscal_day_no = state
        .get("fiscalDayNo")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let fiscal = json!({
        "receiptId": receipt_id,
        "receiptGlobalNo": receipt_global_no,
        "receiptCounter": receipt_counter,
        "fiscalDayNo": fiscal_day_no,
        "invoiceNo": invoice_no,
        "verificationCode": format_verification_code(&qr_data),
        "qrCodeUrl": qr_code_url,
        "receiptHash": built.receipt_hash,
        "serverDate": response.get("serverDate"),
        "receiptType": receipt_type,
    });

    Ok((fiscal, next_state))
}

pub fn get_settings(
    app: &AppState,
    session: &SessionState,
) -> ActionResult<Value> {
    let org_id = match session_org(app, session) {
        Ok((_, id)) => id,
        Err(e) => return action_err(e),
    };
    let settings = match load_settings(app, &org_id) {
        Ok(s) => s,
        Err(e) => return action_err(e),
    };
    let state = match load_state(app, &org_id) {
        Ok(s) => s,
        Err(e) => return action_err(e),
    };
    let data = match settings {
        None => json!({ "settings": null, "state": state }),
        Some(s) => {
            let mut safe = s.clone();
            if let Some(obj) = safe.as_object_mut() {
                let has_cert = obj
                    .get("certificatePem")
                    .and_then(|v| v.as_str())
                    .map(|s| !s.is_empty())
                    .unwrap_or(false);
                let has_key = obj
                    .get("privateKeyPem")
                    .and_then(|v| v.as_str())
                    .map(|s| !s.is_empty())
                    .unwrap_or(false);
                let has_activation = obj
                    .get("activationKey")
                    .and_then(|v| v.as_str())
                    .map(|s| !s.is_empty())
                    .unwrap_or(false);
                obj.remove("certificatePem");
                obj.remove("privateKeyPem");
                obj.remove("activationKey");
                obj.insert("hasCertificate".into(), json!(has_cert));
                obj.insert("hasPrivateKey".into(), json!(has_key));
                obj.insert("hasActivationKey".into(), json!(has_activation));
            }
            json!({ "settings": safe, "state": state })
        }
    };
    action_ok(data)
}

pub fn update_settings(
    app: &AppState,
    session: &SessionState,
    patch: Value,
) -> ActionResult<()> {
    let org_id = match session_org(app, session) {
        Ok((_, id)) => id,
        Err(e) => return action_err(e),
    };
    let existing = match load_settings(app, &org_id) {
        Ok(s) => s,
        Err(e) => return action_err(e),
    }
    .unwrap_or_else(|| {
        json!({
            "orgId": org_id,
            "enabled": false,
            "environment": "test",
            "deviceId": 0,
            "deviceSerialNo": "",
            "deviceModelName": DEFAULT_DEVICE_MODEL_NAME,
            "deviceModelVersion": DEFAULT_DEVICE_MODEL_VERSION,
            "certificatePem": "",
            "privateKeyPem": "",
            "receiptCurrency": "USD",
            "taxInclusive": true,
            "updatedAt": iso_now(),
        })
    });
    let mut next = existing.as_object().cloned().unwrap_or_default();
    if let Some(patch_obj) = patch.as_object() {
        for (k, v) in patch_obj {
            next.insert(k.clone(), v.clone());
        }
    }
    next.insert("orgId".into(), json!(org_id));
    next.insert("updatedAt".into(), json!(iso_now()));
    match upsert_org_doc(app, SETTINGS_COL, &org_id, next) {
        Ok(()) => action_ok(()),
        Err(e) => action_err(e),
    }
}

pub fn sync_config(app: &AppState, session: &SessionState) -> ActionResult<Value> {
    let org_id = match session_org(app, session) {
        Ok((_, id)) => id,
        Err(e) => return action_err(e),
    };
    let settings = match load_settings(app, &org_id) {
        Ok(Some(s)) => s,
        _ => return action_err("Configure device ID and certificates first"),
    };
    let cert = settings.get("certificatePem").and_then(|v| v.as_str()).unwrap_or("");
    let key = settings.get("privateKeyPem").and_then(|v| v.as_str()).unwrap_or("");
    let device_id = settings.get("deviceId").and_then(|v| v.as_i64()).unwrap_or(0);
    if cert.is_empty() || key.is_empty() || device_id == 0 {
        return action_err("Configure device ID and certificates first");
    }
    let environment = settings
        .get("environment")
        .and_then(|v| v.as_str())
        .unwrap_or("test");
    let creds = match creds_from_settings(&settings) {
        Ok(c) => c,
        Err(e) => return action_err(e),
    };
    let config = match fdms_get_config(environment, device_id, &creds) {
        Ok(c) => c,
        Err(e) => return action_err(e),
    };
    let qr_url = config
        .get("qrUrl")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            if environment == "production" {
                FDMS_PROD_QR.to_string()
            } else {
                FDMS_TEST_QR.to_string()
            }
        });
    let mut patch = Map::new();
    patch.insert("qrUrl".into(), json!(qr_url));
    if let Some(v) = config.get("taxPayerName") {
        patch.insert("taxPayerName".into(), v.clone());
    }
    if let Some(v) = config.get("taxPayerTIN") {
        patch.insert("taxPayerTIN".into(), v.clone());
    }
    if let Some(v) = config.get("vatNumber") {
        patch.insert("vatNumber".into(), v.clone());
    }
    if let Some(v) = config.get("applicableTaxes") {
        patch.insert("applicableTaxes".into(), v.clone());
    }
    let _ = update_settings(app, session, Value::Object(patch));
    action_ok(config)
}

pub fn verify_taxpayer(
    device_id: i64,
    activation_key: String,
    environment: String,
) -> ActionResult<Value> {
    match fdms_verify_taxpayer(&environment, device_id, &activation_key) {
        Ok(data) => action_ok(data),
        Err(e) => action_err(e),
    }
}

pub fn ping_device(app: &AppState, session: &SessionState) -> ActionResult<Value> {
    let org_id = match session_org(app, session) {
        Ok((_, id)) => id,
        Err(e) => return action_err(e),
    };
    let settings = match load_settings(app, &org_id) {
        Ok(Some(s)) => s,
        _ => return action_err("ZIMRA fiscalisation is not configured"),
    };
    if !settings.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
        return action_err("ZIMRA fiscalisation is not configured");
    }
    let cert = settings.get("certificatePem").and_then(|v| v.as_str()).unwrap_or("");
    if cert.is_empty() {
        return action_err("ZIMRA fiscalisation is not configured");
    }
    let environment = settings
        .get("environment")
        .and_then(|v| v.as_str())
        .unwrap_or("test");
    let device_id = settings.get("deviceId").and_then(|v| v.as_i64()).unwrap_or(0);
    let creds = match creds_from_settings(&settings) {
        Ok(c) => c,
        Err(e) => return action_err(e),
    };
    match fdms_ping(environment, device_id, &creds) {
        Ok(data) => action_ok(data),
        Err(e) => action_err(e),
    }
}

pub fn refresh_status(app: &AppState, session: &SessionState) -> ActionResult<Value> {
    let org_id = match session_org(app, session) {
        Ok((_, id)) => id,
        Err(e) => return action_err(e),
    };
    let settings = match load_settings(app, &org_id) {
        Ok(Some(s)) => s,
        _ => return action_err("ZIMRA not configured"),
    };
    let cert = settings.get("certificatePem").and_then(|v| v.as_str()).unwrap_or("");
    if cert.is_empty() {
        return action_err("ZIMRA not configured");
    }
    let environment = settings
        .get("environment")
        .and_then(|v| v.as_str())
        .unwrap_or("test");
    let device_id = settings.get("deviceId").and_then(|v| v.as_i64()).unwrap_or(0);
    let creds = match creds_from_settings(&settings) {
        Ok(c) => c,
        Err(e) => return action_err(e),
    };
    let status = match fdms_get_status(environment, device_id, &creds) {
        Ok(s) => s,
        Err(e) => return action_err(e),
    };
    let state = match load_state(app, &org_id) {
        Ok(s) => s,
        Err(e) => return action_err(e),
    };
    let mut next = state;
    if let Some(obj) = next.as_object_mut() {
        if let Some(day_no) = status.get("fiscalDayNo").and_then(|v| v.as_i64()) {
            obj.insert("fiscalDayNo".into(), json!(day_no));
        }
        if let Some(day_status) = status.get("fiscalDayStatus").and_then(|v| v.as_str()) {
            obj.insert("fiscalDayStatus".into(), json!(day_status));
        }
        obj.insert("updatedAt".into(), json!(iso_now()));
    }
    if let Err(e) = save_state(app, &next) {
        return action_err(e);
    }
    action_ok(json!({ "status": status, "state": next }))
}

pub fn open_fiscal_day(app: &AppState, session: &SessionState) -> ActionResult<Value> {
    let org_id = match session_org(app, session) {
        Ok((_, id)) => id,
        Err(e) => return action_err(e),
    };
    let settings = match load_settings(app, &org_id) {
        Ok(Some(s)) => s,
        _ => return action_err("ZIMRA fiscalisation is disabled"),
    };
    if !settings.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
        return action_err("ZIMRA fiscalisation is disabled");
    }
    let cert = settings.get("certificatePem").and_then(|v| v.as_str()).unwrap_or("");
    let key = settings.get("privateKeyPem").and_then(|v| v.as_str()).unwrap_or("");
    if cert.is_empty() || key.is_empty() {
        return action_err("Device certificate and private key required");
    }
    let environment = settings
        .get("environment")
        .and_then(|v| v.as_str())
        .unwrap_or("test");
    let device_id = settings.get("deviceId").and_then(|v| v.as_i64()).unwrap_or(0);
    let creds = match creds_from_settings(&settings) {
        Ok(c) => c,
        Err(e) => return action_err(e),
    };
    let status = match fdms_get_status(environment, device_id, &creds) {
        Ok(s) => s,
        Err(e) => return action_err(e),
    };
    if status
        .get("fiscalDayStatus")
        .and_then(|v| v.as_str())
        != Some("FiscalDayClosed")
    {
        return action_err("Close the current fiscal day before opening a new one");
    }
    let state = match load_state(app, &org_id) {
        Ok(s) => s,
        Err(e) => return action_err(e),
    };
    let last_fdms_day = status
        .get("lastFiscalDayNo")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let local_day = state
        .get("fiscalDayNo")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let next_day_no = last_fdms_day.max(local_day) + 1;
    let opened_at = iso_now().replace(".000Z", "").chars().take(19).collect::<String>();
    let result = match fdms_open_day(environment, device_id, &creds, next_day_no, &opened_at) {
        Ok(r) => r,
        Err(e) => return action_err(e),
    };
    let fiscal_day_no = result
        .get("fiscalDayNo")
        .and_then(|v| v.as_i64())
        .unwrap_or(next_day_no);
    let mut next_state = state;
    if let Some(obj) = next_state.as_object_mut() {
        obj.insert("fiscalDayNo".into(), json!(fiscal_day_no));
        obj.insert("fiscalDayStatus".into(), json!("FiscalDayOpened"));
        obj.insert("fiscalDayOpenedAt".into(), json!(opened_at));
        obj.insert("receiptCounter".into(), json!(0));
        obj.remove("previousReceiptHash");
        obj.insert("fiscalDayCounters".into(), json!([]));
        obj.insert("updatedAt".into(), json!(iso_now()));
    }
    if let Err(e) = save_state(app, &next_state) {
        return action_err(e);
    }
    action_ok(json!({ "result": result, "state": next_state }))
}

pub fn register_device(
    app: &AppState,
    session: &SessionState,
    environment: String,
    device_id: i64,
    device_serial_no: String,
    activation_key: String,
    device_model_name: Option<String>,
    device_model_version: Option<String>,
) -> ActionResult<Value> {
    let org_id = match session_org(app, session) {
        Ok((_, id)) => id,
        Err(e) => return action_err(e),
    };
    let result = match register_zimra_device(
        &environment,
        device_id,
        &device_serial_no,
        &activation_key,
        device_model_name.as_deref(),
        device_model_version.as_deref(),
    ) {
        Ok(r) => r,
        Err(e) => return action_err(e),
    };
    let mut patch = Map::new();
    patch.insert("enabled".into(), json!(false));
    patch.insert("environment".into(), json!(environment));
    patch.insert("deviceId".into(), json!(device_id));
    patch.insert("deviceSerialNo".into(), json!(device_serial_no));
    patch.insert("activationKey".into(), json!(activation_key));
    patch.insert(
        "deviceModelName".into(),
        json!(device_model_name.unwrap_or_else(|| DEFAULT_DEVICE_MODEL_NAME.to_string())),
    );
    patch.insert(
        "deviceModelVersion".into(),
        json!(device_model_version.unwrap_or_else(|| DEFAULT_DEVICE_MODEL_VERSION.to_string())),
    );
    patch.insert("certificatePem".into(), json!(result.certificate_pem));
    patch.insert("privateKeyPem".into(), json!(result.private_key_pem));
    if let Err(e) = upsert_org_doc(app, SETTINGS_COL, &org_id, patch) {
        return action_err(e);
    }
    action_ok(json!({
        "operationID": result.operation_id,
        "hasCertificate": true,
        "orgId": org_id,
    }))
}

pub fn close_fiscal_day(app: &AppState, session: &SessionState) -> ActionResult<Value> {
    let org_id = match session_org(app, session) {
        Ok((_, id)) => id,
        Err(e) => return action_err(e),
    };
    let settings = match load_settings(app, &org_id) {
        Ok(Some(s)) => s,
        _ => return action_err("Device certificate and private key required"),
    };
    let cert = settings.get("certificatePem").and_then(|v| v.as_str()).unwrap_or("");
    let key = settings.get("privateKeyPem").and_then(|v| v.as_str()).unwrap_or("");
    if cert.is_empty() || key.is_empty() {
        return action_err("Device certificate and private key required");
    }
    let state = match load_state(app, &org_id) {
        Ok(s) => s,
        Err(e) => return action_err(e),
    };
    let day_status = state
        .get("fiscalDayStatus")
        .and_then(|v| v.as_str())
        .unwrap_or("FiscalDayClosed");
    if day_status != "FiscalDayOpened" && day_status != "FiscalDayCloseFailed" {
        return action_err("No open fiscal day to close");
    }
    let fiscal_day_no = state.get("fiscalDayNo").and_then(|v| v.as_i64()).unwrap_or(0);
    let receipt_counter = state
        .get("receiptCounter")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let opened_at = state
        .get("fiscalDayOpenedAt")
        .and_then(|v| v.as_str());
    let fiscal_day_date = fiscal_day_date_from_opened_at(opened_at);
    let counters = state
        .get("fiscalDayCounters")
        .and_then(|v| v.as_array())
        .map(|a| counters_from_json(a))
        .unwrap_or_default();
    let device_id = settings.get("deviceId").and_then(|v| v.as_i64()).unwrap_or(0);
    let payload = match build_close_day_payload(
        device_id,
        fiscal_day_no,
        &fiscal_day_date,
        &counters,
        receipt_counter,
        key,
    ) {
        Ok(p) => p,
        Err(e) => return action_err(e),
    };
    let environment = settings
        .get("environment")
        .and_then(|v| v.as_str())
        .unwrap_or("test");
    let creds = match creds_from_settings(&settings) {
        Ok(c) => c,
        Err(e) => return action_err(e),
    };
    let result = match fdms_close_day(environment, device_id, &creds, payload) {
        Ok(r) => r,
        Err(e) => return action_err(e),
    };
    let mut next_state = state.clone();
    if let Some(obj) = next_state.as_object_mut() {
        obj.insert("fiscalDayStatus".into(), json!("FiscalDayCloseInitiated"));
        obj.insert("updatedAt".into(), json!(iso_now()));
    }
    let _ = save_state(app, &next_state);
    std::thread::sleep(std::time::Duration::from_millis(1500));
    let status = match fdms_get_status(environment, device_id, &creds) {
        Ok(s) => s,
        Err(e) => return action_err(e),
    };
    if let Some(obj) = next_state.as_object_mut() {
        let closed_status = status
            .get("fiscalDayStatus")
            .and_then(|v| v.as_str())
            .unwrap_or("FiscalDayClosed");
        obj.insert("fiscalDayStatus".into(), json!(closed_status));
        obj.insert("fiscalDayCounters".into(), json!([]));
        obj.insert("receiptCounter".into(), json!(0));
        obj.remove("previousReceiptHash");
        obj.insert("updatedAt".into(), json!(iso_now()));
    }
    if let Err(e) = save_state(app, &next_state) {
        return action_err(e);
    }
    action_ok(json!({ "result": result, "state": next_state }))
}

fn ensure_fiscal_day_open(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
) -> Result<Value, String> {
    let state = load_state(app, org_id)?;
    let day_status = state
        .get("fiscalDayStatus")
        .and_then(|v| v.as_str())
        .unwrap_or("FiscalDayClosed");
    if day_status == "FiscalDayOpened" || day_status == "FiscalDayCloseFailed" {
        return Ok(state);
    }
    let open = open_fiscal_day(app, session);
    if !open.success {
        return Err(open.error.unwrap_or_else(|| "Fiscal day is not open".to_string()));
    }
    load_state(app, org_id)
}

pub fn fiscalise_sale(
    app: &AppState,
    session: &SessionState,
    order_id: Option<String>,
    invoice_no: String,
    items: Vec<Value>,
    payments: Vec<Value>,
    tax_enabled: Option<bool>,
) -> FiscalFlexibleResult {
    let org_id = match session_org(app, session) {
        Ok((_, id)) => id,
        Err(e) => return fiscal_err(e),
    };
    let settings = match load_settings(app, &org_id) {
        Ok(Some(s)) => s,
        Ok(None) => return fiscal_ok_null(),
        Err(e) => return fiscal_err(e),
    };
    if !settings.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
        return fiscal_ok_null();
    }
    let cert = settings.get("certificatePem").and_then(|v| v.as_str()).unwrap_or("");
    let key = settings.get("privateKeyPem").and_then(|v| v.as_str()).unwrap_or("");
    if cert.is_empty() || key.is_empty() {
        return fiscal_err("ZIMRA device certificate not configured");
    }

    let state = match ensure_fiscal_day_open(app, session, &org_id) {
        Ok(s) => s,
        Err(e) => {
            if is_fdms_connectivity_error(&e) {
                return fiscal_skipped(FISCAL_OFFLINE_MESSAGE);
            }
            return fiscal_err(e);
        }
    };

    let line_items = parse_line_items(&items, tax_enabled);
    let payment_lines = parse_payments(&payments);
    let device_id = settings.get("deviceId").and_then(|v| v.as_i64()).unwrap_or(0);
    let receipt_currency = settings
        .get("receiptCurrency")
        .and_then(|v| v.as_str())
        .unwrap_or("USD");
    let tax_inclusive = settings
        .get("taxInclusive")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let applicable_taxes = settings
        .get("applicableTaxes")
        .and_then(|v| v.as_array())
        .map(|a| a.as_slice());
    let previous_hash = state
        .get("previousReceiptHash")
        .and_then(|v| v.as_str());

    match submit_fiscal_receipt(
        app,
        &settings,
        &state,
        device_id,
        key,
        &invoice_no,
        receipt_currency,
        tax_inclusive,
        &line_items,
        &payment_lines,
        applicable_taxes,
        previous_hash,
        "FISCALINVOICE",
        None,
        None,
    ) {
        Ok((fiscal, _)) => {
            if let Some(oid) = order_id.as_deref() {
                let _ = attach_fiscal_to_pos_order(app, oid, fiscal.clone());
            }
            FiscalFlexibleResult {
                success: true,
                data: Some(fiscal),
                error: None,
                skipped: None,
                warning: None,
            }
        }
        Err(e) => {
            if is_fdms_connectivity_error(&e) {
                fiscal_skipped(FISCAL_OFFLINE_MESSAGE)
            } else {
                fiscal_err(e)
            }
        }
    }
}

pub fn fiscalise_credit_note(
    app: &AppState,
    session: &SessionState,
    order_id: String,
    receipt_notes: Option<String>,
) -> FiscalFlexibleResult {
    let org_id = match session_org(app, session) {
        Ok((_, id)) => id,
        Err(e) => return fiscal_err(e),
    };
    let settings = match load_settings(app, &org_id) {
        Ok(Some(s)) => s,
        _ => return fiscal_err("ZIMRA fiscalisation is disabled"),
    };
    if !settings.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
        return fiscal_err("ZIMRA fiscalisation is disabled");
    }
    let cert = settings.get("certificatePem").and_then(|v| v.as_str()).unwrap_or("");
    let key = settings.get("privateKeyPem").and_then(|v| v.as_str()).unwrap_or("");
    if cert.is_empty() || key.is_empty() {
        return fiscal_err("ZIMRA device certificate not configured");
    }

    let order = match find_org_doc_by_field(app, POS_ORDERS, &org_id, "_id", &order_id) {
        Ok(Some(o)) => o,
        Ok(None) => return fiscal_err("Order not found"),
        Err(e) => return fiscal_err(e),
    };
    if order.get("status").and_then(|v| v.as_str()) == Some("refunded") {
        return fiscal_err("Order already refunded");
    }
    let original_fiscal = order.get("fiscal");
    let receipt_id = original_fiscal
        .and_then(|f| f.get("receiptId"))
        .and_then(|v| v.as_i64());
    if receipt_id.is_none() {
        return fiscal_err("Original order has no fiscal receipt to credit");
    }
    let receipt_global_no = original_fiscal
        .and_then(|f| f.get("receiptGlobalNo"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let fiscal_day_no = original_fiscal
        .and_then(|f| f.get("fiscalDayNo"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    let state = match ensure_fiscal_day_open(app, session, &org_id) {
        Ok(s) => s,
        Err(e) => {
            if is_fdms_connectivity_error(&e) {
                return mark_offline_refund(app, &order_id, FISCAL_OFFLINE_CREDIT_NOTE_MESSAGE);
            }
            return fiscal_err(e);
        }
    };

    let invoice_no = format!("CN-{}", crate::store_util::now_ms());
    let line_items = order
        .get("items")
        .and_then(|v| v.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| {
                    Some(PosFiscalLineItem {
                        name: item.get("name")?.as_str()?.to_string(),
                        price: item.get("price")?.as_f64()?,
                        quantity: item.get("quantity")?.as_f64()?,
                        tax_percent: None,
                        hs_code: None,
                    })
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let payment_method = order
        .get("paymentMethod")
        .and_then(|v| v.as_str())
        .unwrap_or("cash")
        .to_string();
    let total = order.get("total").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let payments = vec![PosFiscalPayment {
        method: payment_method,
        amount: total,
    }];
    let device_id = settings.get("deviceId").and_then(|v| v.as_i64()).unwrap_or(0);
    let receipt_currency = settings
        .get("receiptCurrency")
        .and_then(|v| v.as_str())
        .unwrap_or("USD");
    let tax_inclusive = settings
        .get("taxInclusive")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let applicable_taxes = settings
        .get("applicableTaxes")
        .and_then(|v| v.as_array())
        .map(|a| a.as_slice());
    let previous_hash = state
        .get("previousReceiptHash")
        .and_then(|v| v.as_str());
    let notes = receipt_notes.unwrap_or_else(|| {
        format!(
            "Credit note for {}",
            order
                .get("orderId")
                .and_then(|v| v.as_str())
                .unwrap_or(&order_id)
        )
    });
    let credit_ref = CreditDebitNoteRef {
        receipt_id,
        device_id: Some(device_id),
        receipt_global_no,
        fiscal_day_no,
    };

    match submit_fiscal_receipt(
        app,
        &settings,
        &state,
        device_id,
        key,
        &invoice_no,
        receipt_currency,
        tax_inclusive,
        &line_items,
        &payments,
        applicable_taxes,
        previous_hash,
        "CREDITNOTE",
        Some(&notes),
        Some(&credit_ref),
    ) {
        Ok((fiscal, _)) => {
            let mut patch = Map::new();
            patch.insert("status".into(), json!("refunded"));
            patch.insert("refundedAt".into(), json!(iso_now()));
            patch.insert("creditNoteFiscal".into(), fiscal.clone());
            let _ = update_doc_by_id(app, POS_ORDERS, &order_id, patch);
            FiscalFlexibleResult {
                success: true,
                data: Some(fiscal),
                error: None,
                skipped: None,
                warning: None,
            }
        }
        Err(e) => {
            if is_fdms_connectivity_error(&e) {
                mark_offline_refund(app, &order_id, FISCAL_OFFLINE_CREDIT_NOTE_MESSAGE)
            } else {
                fiscal_err(e)
            }
        }
    }
}

fn mark_offline_refund(app: &AppState, order_id: &str, warning: &str) -> FiscalFlexibleResult {
    let mut patch = Map::new();
    patch.insert("status".into(), json!("refunded"));
    patch.insert("refundedAt".into(), json!(iso_now()));
    patch.insert("refundedWithoutFiscalCreditNote".into(), json!(true));
    let _ = update_doc_by_id(app, POS_ORDERS, order_id, patch);
    fiscal_skipped(warning)
}

fn parse_line_items(items: &[Value], tax_enabled: Option<bool>) -> Vec<PosFiscalLineItem> {
    items
        .iter()
        .filter_map(|item| {
            let mut line = PosFiscalLineItem {
                name: item.get("name")?.as_str()?.to_string(),
                price: item.get("price")?.as_f64()?,
                quantity: item.get("quantity")?.as_f64()?,
                tax_percent: item.get("taxPercent").and_then(|v| v.as_f64()),
                hs_code: item.get("hsCode").and_then(|v| v.as_str()).map(|s| s.to_string()),
            };
            if tax_enabled == Some(false) {
                line.tax_percent = Some(0.0);
            }
            Some(line)
        })
        .collect()
}

fn parse_payments(payments: &[Value]) -> Vec<PosFiscalPayment> {
    payments
        .iter()
        .filter_map(|p| {
            Some(PosFiscalPayment {
                method: p.get("method")?.as_str()?.to_string(),
                amount: p.get("amount")?.as_f64()?,
            })
        })
        .collect()
}
