use serde_json::Value;

const LICENSE_RENEWAL_API_BASE: &str = "https://www.thinkingminds.co.zw";

fn api_base() -> String {
    std::env::var("LICENSE_RENEWAL_API_BASE")
        .or_else(|_| std::env::var("NEXT_PUBLIC_LICENSE_RENEWAL_API_BASE"))
        .unwrap_or_else(|_| LICENSE_RENEWAL_API_BASE.to_string())
}

fn http_client() -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())
}

fn parse_json_response(response: reqwest::blocking::Response) -> Result<Value, String> {
    let status = response.status();
    let body: Value = response
        .json()
        .map_err(|_| {
            if status.is_success() {
                "Licence server returned a non-JSON response".to_string()
            } else {
                format!("Licence server error ({status})")
            }
        })?;

    if !status.is_success() {
        let message = body
            .get("message")
            .or_else(|| body.get("error"))
            .and_then(|v| v.as_str())
            .unwrap_or(&format!("Licence server returned {status}"))
            .to_string();
        return Err(message);
    }

    Ok(body)
}

pub fn get_renewal_options() -> Result<Value, String> {
    let client = http_client()?;
    let url = format!("{}/api/license-renewal/options", api_base().trim_end_matches('/'));
    let response = client
        .get(&url)
        .header("Accept", "application/json")
        .send()
        .map_err(|e| format!("Licence server request failed: {e}"))?;
    parse_json_response(response)
}

pub fn peek_renewal_org(query: String) -> Result<Value, String> {
    let client = http_client()?;
    let url = format!("{}/api/license-renewal/peek", api_base().trim_end_matches('/'));
    let response = client
        .post(&url)
        .header("Accept", "application/json")
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "query": query.trim() }))
        .send()
        .map_err(|e| format!("Licence server request failed: {e}"))?;
    parse_json_response(response)
}

pub fn register_renewal_org(
    org_id: String,
    license_type: String,
    org_name: String,
) -> Result<Value, String> {
    let client = http_client()?;
    let url = format!("{}/api/license-renewal/register", api_base().trim_end_matches('/'));
    let response = client
        .post(&url)
        .header("Accept", "application/json")
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "orgId": org_id,
            "licenseType": license_type,
            "orgName": org_name,
        }))
        .send()
        .map_err(|e| format!("Licence server request failed: {e}"))?;
    parse_json_response(response)
}

pub fn initiate_renewal_payment(
    org_id: String,
    license_type: String,
    phone_number: String,
    contact_name: Option<String>,
) -> Result<Value, String> {
    let client = http_client()?;
    let url = format!("{}/api/license-renewal/pay", api_base().trim_end_matches('/'));
    let mut body = serde_json::json!({
        "orgId": org_id,
        "licenseType": license_type,
        "phoneNumber": phone_number,
    });
    if let Some(name) = contact_name.filter(|n| !n.trim().is_empty()) {
        body["contactName"] = serde_json::json!(name);
    }
    let response = client
        .post(&url)
        .header("Accept", "application/json")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| format!("Licence server request failed: {e}"))?;
    parse_json_response(response)
}

fn encode_query_component(value: &str) -> String {
    value
        .bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                (b as char).to_string()
            }
            _ => format!("%{b:02X}"),
        })
        .collect()
}

pub fn poll_renewal_status(renewal_id: String) -> Result<Value, String> {
    let client = http_client()?;
    let id = encode_query_component(renewal_id.trim());
    let url = format!(
        "{}/api/license-renewal/status?renewalId={id}",
        api_base().trim_end_matches('/')
    );
    let response = client
        .get(&url)
        .header("Accept", "application/json")
        .send()
        .map_err(|e| format!("Licence server request failed: {e}"))?;
    parse_json_response(response)
}
