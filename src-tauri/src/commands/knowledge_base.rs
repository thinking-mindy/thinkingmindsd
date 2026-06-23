use serde_json::Value;
use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::knowledge_base::service::{
    create_article, delete_article, get_article, get_articles_by_category, get_articles_by_org, search_articles,
    update_article,
};
use crate::state::AppState;

#[tauri::command]
pub fn knowledge_base_create_article_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    data: Value,
) -> ActionResult<Value> {
    create_article(&app, &session, data)
}

#[tauri::command]
pub fn knowledge_base_get_article_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    article_id: String,
) -> ActionResult<Value> {
    get_article(&app, &session, &article_id)
}

#[tauri::command]
pub fn knowledge_base_get_articles_by_org_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
) -> ActionResult<Vec<Value>> {
    get_articles_by_org(&app, &session, &org_id)
}

#[tauri::command]
pub fn knowledge_base_get_articles_by_category_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
    category: String,
) -> ActionResult<Vec<Value>> {
    get_articles_by_category(&app, &session, &org_id, &category)
}

#[tauri::command]
pub fn knowledge_base_search_articles_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    org_id: String,
    query: String,
) -> ActionResult<Vec<Value>> {
    search_articles(&app, &session, &org_id, &query)
}

#[tauri::command]
pub fn knowledge_base_update_article_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    article_id: String,
    data: Value,
) -> ActionResult<Value> {
    update_article(&app, &session, &article_id, data)
}

#[tauri::command]
pub fn knowledge_base_delete_article_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    article_id: String,
) -> ActionResult<bool> {
    delete_article(&app, &session, &article_id)
}
