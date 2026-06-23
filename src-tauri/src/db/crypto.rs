use aes_gcm::{
    aead::{Aead, KeyInit, Payload},
    Aes256Gcm,
};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use scrypt::{scrypt, Params};
use serde::{Deserialize, Serialize};
use serde_json::Value;

const ENVELOPE_VERSION: u64 = 1;
const SCRYPT_SALT: &str = "thinkingminds-local-db-v1";
const KEY_BYTES: usize = 32;
/// Stable default — matches `src/lib/desktop-secrets.ts`.
const DEFAULT_DB_KEY: &str = "thinkingminds-minds-local-db-v1";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedEnvelope {
    pub v: u64,
    pub algo: String,
    pub iv: String,
    pub tag: String,
    pub data: String,
}

fn resolve_secret() -> String {
    std::env::var("LOCAL_DB_ENCRYPTION_KEY")
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| DEFAULT_DB_KEY.to_string())
}

fn derive_key(secret: &str) -> Result<[u8; KEY_BYTES], String> {
    if secret.len() == 64 && secret.chars().all(|c| c.is_ascii_hexdigit()) {
        let mut key = [0u8; KEY_BYTES];
        for i in 0..KEY_BYTES {
            key[i] = u8::from_str_radix(&secret[i * 2..i * 2 + 2], 16)
                .map_err(|e| e.to_string())?;
        }
        return Ok(key);
    }

    let params = Params::new(14, 8, 1, KEY_BYTES).map_err(|e| e.to_string())?;
    let mut key = [0u8; KEY_BYTES];
    scrypt(
        secret.as_bytes(),
        SCRYPT_SALT.as_bytes(),
        &params,
        &mut key,
    )
    .map_err(|e| e.to_string())?;
    Ok(key)
}

fn master_key() -> Result<[u8; KEY_BYTES], String> {
    derive_key(&resolve_secret())
}

pub fn is_encrypted_envelope(value: &Value) -> bool {
    value
        .as_object()
        .map(|o| {
            o.get("v").and_then(|v| v.as_u64()) == Some(ENVELOPE_VERSION)
                && o.get("algo").and_then(|v| v.as_str()) == Some("AES-256-GCM")
                && o.get("iv").and_then(|v| v.as_str()).is_some()
                && o.get("tag").and_then(|v| v.as_str()).is_some()
                && o.get("data").and_then(|v| v.as_str()).is_some()
        })
        .unwrap_or(false)
}

pub fn decrypt_payload(envelope: &EncryptedEnvelope, context: &str) -> Result<String, String> {
    let key = master_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let iv = B64.decode(&envelope.iv).map_err(|e| e.to_string())?;
    let tag = B64.decode(&envelope.tag).map_err(|e| e.to_string())?;
    let data = B64.decode(&envelope.data).map_err(|e| e.to_string())?;

    let nonce = aes_gcm::Nonce::from_slice(&iv);
    let mut ciphertext = data;
    ciphertext.extend_from_slice(&tag);

    let plain = cipher
        .decrypt(
            nonce,
            Payload {
                msg: &ciphertext,
                aad: context.as_bytes(),
            },
        )
        .map_err(|e| format!("decrypt failed ({context}): {e}"))?;

    String::from_utf8(plain).map_err(|e| e.to_string())
}

pub fn encrypt_payload(plaintext: &str, context: &str) -> Result<EncryptedEnvelope, String> {
    let key = master_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let mut iv_bytes = [0u8; 12];
    getrandom::getrandom(&mut iv_bytes).map_err(|e| e.to_string())?;
    let nonce = aes_gcm::Nonce::from_slice(&iv_bytes);

    let encrypted = cipher
        .encrypt(
            nonce,
            Payload {
                msg: plaintext.as_bytes(),
                aad: context.as_bytes(),
            },
        )
        .map_err(|e| format!("encrypt failed ({context}): {e}"))?;

    if encrypted.len() < 16 {
        return Err("ciphertext too short".into());
    }
    let (data, tag) = encrypted.split_at(encrypted.len() - 16);

    Ok(EncryptedEnvelope {
        v: ENVELOPE_VERSION,
        algo: "AES-256-GCM".into(),
        iv: B64.encode(iv_bytes),
        tag: B64.encode(tag),
        data: B64.encode(data),
    })
}

pub fn parse_collection_content(raw: &str, context: &str) -> Result<Vec<Value>, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(vec![]);
    }

    let parsed: Value =
        serde_json::from_str(trimmed).map_err(|_| format!("corrupt local database ({context})"))?;

    if let Some(arr) = parsed.as_array() {
        return Ok(arr.clone());
    }

    if is_encrypted_envelope(&parsed) {
        let envelope: EncryptedEnvelope =
            serde_json::from_value(parsed).map_err(|e| e.to_string())?;
        let plaintext = decrypt_payload(&envelope, context)?;
        let docs: Value = serde_json::from_str(&plaintext).map_err(|e| e.to_string())?;
        return Ok(docs.as_array().cloned().unwrap_or_default());
    }

    Err(format!("unsupported local database format ({context})"))
}

pub fn serialize_collection_content(docs: &[Value], context: &str) -> Result<String, String> {
    let plaintext = serde_json::to_string(docs).map_err(|e| e.to_string())?;
    let envelope = encrypt_payload(&plaintext, context)?;
    serde_json::to_string_pretty(&envelope).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip_encrypted_collection() {
        let context = "thinkingminds:users.accounts.json";
        let docs = vec![serde_json::json!({"id": "u1", "email": "test@local"})];
        let serialized = serialize_collection_content(&docs, context).expect("encrypt");
        let parsed = parse_collection_content(&serialized, context).expect("decrypt");
        assert_eq!(parsed.len(), 1);
        assert_eq!(parsed[0]["email"], "test@local");
    }

    #[test]
    fn reads_legacy_plaintext_array() {
        let context = "thinkingminds:plans.pricing.json";
        let raw = r#"[{"slug":"free","name":"Free"}]"#;
        let docs = parse_collection_content(raw, context).expect("parse");
        assert_eq!(docs.len(), 1);
    }
}
