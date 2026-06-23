use rcgen::{
    CertificateParams, DistinguishedName, DnType, KeyPair, PKCS_RSA_SHA256,
};

use crate::fiscal::client::fdms_register_device;

pub struct RegisterResult {
    pub private_key_pem: String,
    pub certificate_pem: String,
    pub csr_pem: String,
    pub operation_id: Option<String>,
}

pub fn build_csr_pem(
    device_serial_no: &str,
    device_id: i64,
) -> Result<(String, String), String> {
    let formatted_id = format!("{device_id:010}");
    let common_name = format!("ZIMRA-{device_serial_no}-{formatted_id}");

    let key_pair = KeyPair::generate_for(&PKCS_RSA_SHA256)
        .map_err(|e| format!("Key generation failed: {e}"))?;
    let private_key_pem = key_pair.serialize_pem();

    let mut params = CertificateParams::default();
    params.distinguished_name = DistinguishedName::new();
    params
        .distinguished_name
        .push(DnType::CommonName, common_name);
    let csr_pem = params
        .serialize_request(&key_pair)
        .map_err(|e| format!("CSR generation failed: {e}"))?
        .pem()
        .map_err(|e| format!("CSR PEM failed: {e}"))?;

    Ok((private_key_pem, csr_pem))
}

pub fn register_zimra_device(
    environment: &str,
    device_id: i64,
    device_serial_no: &str,
    activation_key: &str,
    device_model_name: Option<&str>,
    device_model_version: Option<&str>,
) -> Result<RegisterResult, String> {
    let (private_key_pem, csr_pem) = build_csr_pem(device_serial_no, device_id)?;
    let result = fdms_register_device(
        environment,
        device_id,
        activation_key,
        &csr_pem,
        device_model_name,
        device_model_version,
    )?;
    let certificate_pem = result
        .get("certificate")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing certificate in FDMS response".to_string())?
        .to_string();
    let operation_id = result
        .get("operationID")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    Ok(RegisterResult {
        private_key_pem,
        certificate_pem,
        csr_pem,
        operation_id,
    })
}
