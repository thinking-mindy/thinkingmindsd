use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde_json::Value;

use super::collections::{collection_file, crypto_context, known_collections};
use super::crypto::{is_encrypted_envelope, parse_collection_content, serialize_collection_content};

static DB_WRITE_LOCK: Mutex<()> = Mutex::new(());

fn with_db_lock<T>(f: impl FnOnce() -> Result<T, String>) -> Result<T, String> {
    let _guard = DB_WRITE_LOCK
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    f()
}

pub struct CollectionMeta {
    pub collection: String,
    pub file_name: String,
    pub file_path: String,
    pub exists: bool,
    pub encrypted: bool,
    pub doc_count: usize,
}

pub fn collection_path(db_dir: &Path, collection: &str) -> PathBuf {
    db_dir.join(collection_file(collection))
}

pub fn read_collection(
    db_dir: &Path,
    db_name: &str,
    collection: &str,
) -> Result<Vec<Value>, String> {
    let path = collection_path(db_dir, collection);
    let file_name = collection_file(collection);
    let context = crypto_context(db_name, &file_name);

    with_db_lock(|| {
        let raw = match std::fs::read_to_string(&path) {
            Ok(s) => s,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(vec![]),
            Err(e) => return Err(format!("read {path:?}: {e}")),
        };
        parse_collection_content(&raw, &context)
    })
}

pub fn write_collection(
    db_dir: &Path,
    db_name: &str,
    collection: &str,
    docs: &[Value],
) -> Result<(), String> {
    let path = collection_path(db_dir, collection);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let file_name = collection_file(collection);
    let context = crypto_context(db_name, &file_name);
    let content = serialize_collection_content(docs, &context)?;

    with_db_lock(|| {
        let tmp = path.with_extension(format!(
            "tmp.{}.{}",
            std::process::id(),
            uuid_simple()
        ));
        std::fs::write(&tmp, &content).map_err(|e| e.to_string())?;
        std::fs::rename(&tmp, &path).map_err(|e| {
            let _ = std::fs::remove_file(&tmp);
            e.to_string()
        })
    })
}

pub fn collection_meta(db_dir: &Path, db_name: &str, collection: &str) -> CollectionMeta {
    let file_name = collection_file(collection);
    let path = db_dir.join(&file_name);
    let context = crypto_context(db_name, &file_name);

    let mut meta = CollectionMeta {
        collection: collection.to_string(),
        file_name: file_name.clone(),
        file_path: path.to_string_lossy().into_owned(),
        exists: path.exists(),
        encrypted: false,
        doc_count: 0,
    };

    if !meta.exists {
        return meta;
    }

    match std::fs::read_to_string(&path) {
        Ok(raw) => {
            let trimmed = raw.trim();
            if trimmed.is_empty() {
                return meta;
            }
            if let Ok(parsed) = serde_json::from_str::<Value>(trimmed) {
                meta.encrypted = is_encrypted_envelope(&parsed);
            }
            if let Ok(docs) = parse_collection_content(&raw, &context) {
                meta.doc_count = docs.len();
            }
        }
        Err(_) => {}
    }

    meta
}

pub fn list_collection_meta(db_dir: &Path, db_name: &str) -> Vec<CollectionMeta> {
    known_collections()
        .iter()
        .map(|name| collection_meta(db_dir, db_name, name))
        .collect()
}

fn uuid_simple() -> String {
    let mut bytes = [0u8; 8];
    let _ = getrandom::getrandom(&mut bytes);
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}
