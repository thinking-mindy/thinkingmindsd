pub mod accounting;
pub mod admin;
pub mod analytics;
pub mod assets;
pub mod auth;
pub mod crm;
pub mod currencies;
pub mod audit;
pub mod finance;
pub mod fiscal;
pub mod helpdesk;
pub mod inventory;
pub mod join_requests;
pub mod knowledge_base;
pub mod licensing;
pub mod orgs;
pub mod overrides;
pub mod payments;
pub mod payroll;
pub mod plans;
pub mod pos;
pub mod projects;
pub mod purchase_orders;
pub mod receipt;
pub mod school;
pub mod user_requests;
pub mod user_profile;
pub mod users;

use serde::Serialize;
use tauri::State;

use crate::db::{self, store};
use crate::state::AppState;

#[derive(Serialize)]
pub struct HealthResponse {
    pub ok: bool,
    pub version: &'static str,
    pub backend: &'static str,
}

#[derive(Serialize)]
pub struct AppPaths {
    pub data_root: String,
    pub db_dir: String,
    pub secrets_dir: String,
}

#[derive(Serialize)]
pub struct CollectionMetaDto {
    pub collection: String,
    pub file_name: String,
    pub file_path: String,
    pub exists: bool,
    pub encrypted: bool,
    pub doc_count: usize,
}

#[tauri::command]
pub fn health_check() -> HealthResponse {
    HealthResponse {
        ok: true,
        version: env!("CARGO_PKG_VERSION"),
        backend: "tauri",
    }
}

#[tauri::command]
pub fn get_app_paths(state: State<'_, AppState>) -> AppPaths {
    AppPaths {
        data_root: state.data_root.to_string_lossy().into_owned(),
        db_dir: state.db_dir().to_string_lossy().into_owned(),
        secrets_dir: state.secrets_dir().to_string_lossy().into_owned(),
    }
}

#[tauri::command]
pub fn list_db_collections(state: State<'_, AppState>) -> Vec<CollectionMetaDto> {
    store::list_collection_meta(&state.db_dir(), db::DB_NAME)
        .into_iter()
        .map(|m| CollectionMetaDto {
            collection: m.collection,
            file_name: m.file_name,
            file_path: m.file_path,
            exists: m.exists,
            encrypted: m.encrypted,
            doc_count: m.doc_count,
        })
        .collect()
}

#[tauri::command]
pub fn read_collection(
    state: State<'_, AppState>,
    collection: String,
) -> Result<Vec<serde_json::Value>, String> {
    store::read_collection(&state.db_dir(), db::DB_NAME, &collection)
}

#[tauri::command]
pub fn write_collection(
    state: State<'_, AppState>,
    collection: String,
    docs: Vec<serde_json::Value>,
) -> Result<(), String> {
    store::write_collection(&state.db_dir(), db::DB_NAME, &collection, &docs)
}
