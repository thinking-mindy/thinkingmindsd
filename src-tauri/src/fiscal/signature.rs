use base64::{engine::general_purpose::STANDARD as B64, Engine};
use md5::{Digest, Md5};
use rsa::pkcs1::DecodeRsaPrivateKey;
use rsa::pkcs8::DecodePrivateKey;
use rsa::sha2::Sha256;
use rsa::signature::{SignatureEncoding, Signer};
use rsa::RsaPrivateKey;
use crate::fiscal::math::{format_tax_percent_for_signature, to_cents};

#[derive(Clone, Debug)]
pub struct ReceiptTaxLine {
    pub tax_id: i64,
    pub tax_percent: Option<f64>,
    pub tax_amount: f64,
    pub sales_amount_with_tax: f64,
}

pub fn sha256_base64(data: &str) -> String {
    B64.encode(sha2::Sha256::digest(data.as_bytes()))
}

pub fn sign_rsa_sha256(data: &str, private_key_pem: &str) -> Result<String, String> {
    let private_key = RsaPrivateKey::from_pkcs1_pem(private_key_pem)
        .or_else(|_| RsaPrivateKey::from_pkcs8_pem(private_key_pem))
        .map_err(|e| format!("Invalid private key: {e}"))?;
    let signing_key = rsa::pkcs1v15::SigningKey::<Sha256>::new(private_key);
    let signature = signing_key.sign(data.as_bytes());
    Ok(B64.encode(signature.to_bytes()))
}

pub fn concatenate_receipt_taxes(receipt_taxes: &[ReceiptTaxLine]) -> String {
    let mut sorted = receipt_taxes.to_vec();
    sorted.sort_by_key(|t| t.tax_id);
    sorted
        .iter()
        .map(|tax| {
            format!(
                "{}{}{}",
                format_tax_percent_for_signature(tax.tax_percent),
                to_cents(tax.tax_amount),
                to_cents(tax.sales_amount_with_tax)
            )
        })
        .collect::<String>()
}

pub fn build_receipt_sign_string(
    device_id: i64,
    receipt_type: &str,
    receipt_currency: &str,
    receipt_global_no: i64,
    receipt_date: &str,
    receipt_total: f64,
    receipt_taxes: &[ReceiptTaxLine],
    previous_receipt_hash: Option<&str>,
) -> String {
    let taxes = concatenate_receipt_taxes(receipt_taxes);
    let total_cents = to_cents(receipt_total);
    let base = format!(
        "{}{}{}{}{}{}{}",
        device_id,
        receipt_type.to_uppercase(),
        receipt_currency.to_uppercase(),
        receipt_global_no,
        receipt_date,
        total_cents,
        taxes
    );
    match previous_receipt_hash {
        Some(hash) => format!("{base}{hash}"),
        None => base,
    }
}

pub fn build_device_signature(
    sign_string: &str,
    private_key_pem: &str,
) -> Result<(String, String), String> {
    let hash = sha256_base64(sign_string);
    let signature = sign_rsa_sha256(sign_string, private_key_pem)?;
    Ok((hash, signature))
}

pub fn receipt_qr_data_from_signature(signature_base64: &str) -> Result<String, String> {
    let bytes = B64
        .decode(signature_base64)
        .map_err(|e| format!("Invalid signature base64: {e}"))?;
    let digest = Md5::digest(&bytes);
    Ok(hex::encode(digest)[..16].to_uppercase())
}

pub fn build_receipt_qr_url(
    qr_url: &str,
    device_id: i64,
    receipt_date: &str,
    receipt_global_no: i64,
    signature_base64: &str,
) -> Result<String, String> {
    let base = if qr_url.ends_with('/') {
        qr_url.to_string()
    } else {
        format!("{qr_url}/")
    };
    let device_part = format!("{device_id:010}");
    let (year, month, day) = parse_receipt_date_parts(receipt_date)?;
    let date_part = format!("{day:02}{month:02}{year}");
    let global_part = format!("{receipt_global_no:010}");
    let qr_data = receipt_qr_data_from_signature(signature_base64)?;
    Ok(format!("{base}{device_part}{date_part}{global_part}{qr_data}"))
}

pub fn format_verification_code(qr_data: &str) -> String {
    let clean: String = qr_data
        .chars()
        .filter(|c| c.is_ascii_hexdigit())
        .collect::<String>()
        .to_uppercase();
    if clean.len() < 16 {
        return clean;
    }
    format!(
        "{}-{}-{}-{}",
        &clean[0..4],
        &clean[4..8],
        &clean[8..12],
        &clean[12..16]
    )
}

fn parse_receipt_date_parts(receipt_date: &str) -> Result<(i32, u32, u32), String> {
    if receipt_date.len() < 10 {
        return Err("Invalid receipt date".into());
    }
    let year: i32 = receipt_date[0..4]
        .parse()
        .map_err(|_| "Invalid receipt year")?;
    let month: u32 = receipt_date[5..7]
        .parse()
        .map_err(|_| "Invalid receipt month")?;
    let day: u32 = receipt_date[8..10]
        .parse()
        .map_err(|_| "Invalid receipt day")?;
    Ok((year, month, day))
}
