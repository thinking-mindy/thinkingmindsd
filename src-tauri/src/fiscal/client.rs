use reqwest::blocking::Client;
use reqwest::Identity;
use serde_json::Value;

use crate::fiscal::constants::{
    DEFAULT_DEVICE_MODEL_NAME, DEFAULT_DEVICE_MODEL_VERSION, FDMS_PROD_BASE, FDMS_TEST_BASE,
};

pub struct FdmsCredentials {
    pub certificate_pem: String,
    pub private_key_pem: String,
    pub device_model_name: Option<String>,
    pub device_model_version: Option<String>,
}

fn fdms_base(environment: &str) -> &'static str {
    if environment == "production" {
        FDMS_PROD_BASE
    } else {
        FDMS_TEST_BASE
    }
}

fn device_base(environment: &str, device_id: i64) -> String {
    format!("{}/Device/v1/{}", fdms_base(environment), device_id)
}

fn public_base(environment: &str, device_id: i64) -> String {
    format!("{}/Public/v1/{}", fdms_base(environment), device_id)
}

fn mtls_client(creds: &FdmsCredentials) -> Result<Client, String> {
    let pem = format!("{}\n{}", creds.certificate_pem.trim(), creds.private_key_pem.trim());
    let identity = Identity::from_pem(pem.as_bytes()).map_err(|e| format!("Invalid mTLS identity: {e}"))?;
    Client::builder()
        .identity(identity)
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("HTTP client error: {e}"))
}

fn plain_client() -> Result<Client, String> {
    Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("HTTP client error: {e}"))
}

fn model_name(creds: &FdmsCredentials) -> &str {
    creds
        .device_model_name
        .as_deref()
        .unwrap_or(DEFAULT_DEVICE_MODEL_NAME)
}

fn model_version(creds: &FdmsCredentials) -> &str {
    creds
        .device_model_version
        .as_deref()
        .unwrap_or(DEFAULT_DEVICE_MODEL_VERSION)
}

fn fdms_request(
    creds: &FdmsCredentials,
    url: &str,
    method: &str,
    body: Option<Value>,
) -> Result<Value, String> {
    let client = mtls_client(creds)?;
    let mut req = match method {
        "GET" => client.get(url),
        "POST" => client.post(url),
        _ => return Err(format!("Unsupported HTTP method: {method}")),
    };
    req = req
        .header("Accept", "application/json")
        .header("DeviceModelName", model_name(creds))
        .header("DeviceModelVersion", model_version(creds));
    if let Some(payload) = body {
        req = req.json(&payload);
    }
    let response = req
        .send()
        .map_err(|e| {
            if e.is_timeout() {
                "FDMS request timed out".to_string()
            } else {
                e.to_string()
            }
        })?;
    let status = response.status();
    let text = response.text().unwrap_or_default();
    let parsed: Value = serde_json::from_str(&text).unwrap_or_else(|_| Value::String(text.clone()));
    if status.is_success() {
        return Ok(parsed);
    }
    Err(format!(
        "FDMS {}: {}",
        status.as_u16(),
        if parsed.is_string() {
            parsed.as_str().unwrap_or(&text).to_string()
        } else {
            parsed.to_string()
        }
    ))
}

pub fn fdms_get_config(environment: &str, device_id: i64, creds: &FdmsCredentials) -> Result<Value, String> {
    fdms_request(
        creds,
        &format!("{}/GetConfig", device_base(environment, device_id)),
        "GET",
        None,
    )
}

pub fn fdms_get_status(environment: &str, device_id: i64, creds: &FdmsCredentials) -> Result<Value, String> {
    fdms_request(
        creds,
        &format!("{}/GetStatus", device_base(environment, device_id)),
        "GET",
        None,
    )
}

pub fn fdms_open_day(
    environment: &str,
    device_id: i64,
    creds: &FdmsCredentials,
    fiscal_day_no: i64,
    fiscal_day_opened: &str,
) -> Result<Value, String> {
    fdms_request(
        creds,
        &format!("{}/OpenDay", device_base(environment, device_id)),
        "POST",
        Some(serde_json::json!({
            "fiscalDayNo": fiscal_day_no,
            "fiscalDayOpened": fiscal_day_opened,
        })),
    )
}

pub fn fdms_submit_receipt(
    environment: &str,
    device_id: i64,
    creds: &FdmsCredentials,
    receipt: Value,
) -> Result<Value, String> {
    fdms_request(
        creds,
        &format!("{}/SubmitReceipt", device_base(environment, device_id)),
        "POST",
        Some(serde_json::json!({ "Receipt": receipt })),
    )
}

pub fn fdms_ping(environment: &str, device_id: i64, creds: &FdmsCredentials) -> Result<Value, String> {
    fdms_request(
        creds,
        &format!("{}/Ping", device_base(environment, device_id)),
        "POST",
        Some(serde_json::json!({})),
    )
}

pub fn fdms_close_day(
    environment: &str,
    device_id: i64,
    creds: &FdmsCredentials,
    payload: Value,
) -> Result<Value, String> {
    fdms_request(
        creds,
        &format!("{}/CloseDay", device_base(environment, device_id)),
        "POST",
        Some(payload),
    )
}

pub fn fdms_verify_taxpayer(
    environment: &str,
    device_id: i64,
    activation_key: &str,
) -> Result<Value, String> {
    let client = plain_client()?;
    let url = format!("{}/VerifyTaxpayerInformation", public_base(environment, device_id));
    let response = client
        .post(&url)
        .header("Accept", "application/json")
        .json(&serde_json::json!({
            "deviceID": device_id,
            "activationKey": activation_key,
        }))
        .send()
        .map_err(|e| e.to_string())?;
    let status = response.status();
    let text = response.text().unwrap_or_default();
    let parsed: Value = serde_json::from_str(&text).unwrap_or_else(|_| Value::String(text.clone()));
    if status.is_success() {
        return Ok(parsed);
    }
    Err(format!("FDMS {}: {}", status.as_u16(), parsed))
}

pub fn fdms_register_device(
    environment: &str,
    device_id: i64,
    activation_key: &str,
    certificate_request: &str,
    device_model_name: Option<&str>,
    device_model_version: Option<&str>,
) -> Result<Value, String> {
    let client = plain_client()?;
    let url = format!("{}/RegisterDevice", public_base(environment, device_id));
    let response = client
        .post(&url)
        .header("Accept", "application/json")
        .header(
            "DeviceModelName",
            device_model_name.unwrap_or(DEFAULT_DEVICE_MODEL_NAME),
        )
        .header(
            "DeviceModelVersion",
            device_model_version.unwrap_or(DEFAULT_DEVICE_MODEL_VERSION),
        )
        .json(&serde_json::json!({
            "activationKey": activation_key,
            "certificateRequest": certificate_request,
        }))
        .send()
        .map_err(|e| e.to_string())?;
    let status = response.status();
    let text = response.text().unwrap_or_default();
    let parsed: Value = serde_json::from_str(&text).unwrap_or_else(|_| Value::String(text.clone()));
    if status.is_success() {
        if parsed.get("certificate").and_then(|v| v.as_str()).is_some() {
            return Ok(parsed);
        }
        return Err(format!("FDMS {}: missing certificate in response", status.as_u16()));
    }
    Err(format!("FDMS {}: {}", status.as_u16(), parsed))
}
