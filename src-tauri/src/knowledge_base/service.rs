use serde_json::{json, Map, Value};

use crate::admin::access::{org_id_matches, session_org};
use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::state::AppState;
use crate::store_util::{
    action_err, action_ok, delete_doc_by_id, get_doc, insert_org_doc, iso_now, read_org_docs, update_doc_by_id,
};

const KNOWLEDGE_BASE: &str = "knowledge_base";

pub fn create_article(app: &AppState, session: &SessionState, data: Value) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut payload = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid article payload"),
    };
    payload.remove("_id");
    payload.insert("orgId".into(), json!(org_id.clone()));
    payload.insert("views".into(), json!(0));
    payload.insert("createdAt".into(), json!(iso_now()));
    payload.insert("updatedAt".into(), json!(iso_now()));
    payload.insert("lastUpdated".into(), json!(iso_now()));
    match insert_org_doc(app, KNOWLEDGE_BASE, &org_id, payload) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}

pub fn get_article(app: &AppState, session: &SessionState, article_id: &str) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, KNOWLEDGE_BASE, article_id) {
        Ok(v) => v,
        Err(_) => return action_ok(Value::Null),
    };
    if !org_id_matches(&current, &org_id) {
        return action_ok(Value::Null);
    }
    let views = current.get("views").and_then(|v| v.as_i64()).unwrap_or(0) + 1;
    let mut patch = Map::new();
    patch.insert("views".into(), json!(views));
    patch.insert("updatedAt".into(), json!(iso_now()));
    patch.insert("lastUpdated".into(), json!(iso_now()));
    match update_doc_by_id(app, KNOWLEDGE_BASE, article_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(current),
        Err(_) => action_ok(current),
    }
}

pub fn get_articles_by_org(app: &AppState, session: &SessionState, org_id: &str) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, KNOWLEDGE_BASE, org_id).unwrap_or_default();
    rows.sort_by(|a, b| {
        let at = a.get("updatedAt").and_then(|v| v.as_str()).unwrap_or("");
        let bt = b.get("updatedAt").and_then(|v| v.as_str()).unwrap_or("");
        bt.cmp(at)
    });
    action_ok(rows)
}

pub fn get_articles_by_category(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
    category: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, KNOWLEDGE_BASE, org_id)
        .unwrap_or_default()
        .into_iter()
        .filter(|row| row.get("category").and_then(|v| v.as_str()) == Some(category))
        .collect::<Vec<_>>();
    rows.sort_by(|a, b| {
        let at = a.get("updatedAt").and_then(|v| v.as_str()).unwrap_or("");
        let bt = b.get("updatedAt").and_then(|v| v.as_str()).unwrap_or("");
        bt.cmp(at)
    });
    action_ok(rows)
}

pub fn search_articles(app: &AppState, session: &SessionState, org_id: &str, query: &str) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let needle = query.to_ascii_lowercase();
    let mut rows = read_org_docs(app, KNOWLEDGE_BASE, org_id)
        .unwrap_or_default()
        .into_iter()
        .filter(|row| {
            let title = row.get("title").and_then(|v| v.as_str()).unwrap_or("");
            let content = row.get("content").and_then(|v| v.as_str()).unwrap_or("");
            let category = row.get("category").and_then(|v| v.as_str()).unwrap_or("");
            title.to_ascii_lowercase().contains(&needle)
                || content.to_ascii_lowercase().contains(&needle)
                || category.to_ascii_lowercase().contains(&needle)
        })
        .collect::<Vec<_>>();
    rows.sort_by(|a, b| {
        let at = a.get("updatedAt").and_then(|v| v.as_str()).unwrap_or("");
        let bt = b.get("updatedAt").and_then(|v| v.as_str()).unwrap_or("");
        bt.cmp(at)
    });
    action_ok(rows)
}

pub fn update_article(
    app: &AppState,
    session: &SessionState,
    article_id: &str,
    data: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, KNOWLEDGE_BASE, article_id) {
        Ok(v) => v,
        Err(_) => return action_err("Article not found"),
    };
    if !org_id_matches(&current, &org_id) {
        return action_err("Article not found");
    }
    let mut patch = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid article patch"),
    };
    patch.remove("_id");
    patch.remove("orgId");
    patch.remove("createdAt");
    patch.remove("views");
    patch.insert("updatedAt".into(), json!(iso_now()));
    patch.insert("lastUpdated".into(), json!(iso_now()));
    match update_doc_by_id(app, KNOWLEDGE_BASE, article_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(Value::Null),
        Err(e) => action_err(e),
    }
}

pub fn delete_article(app: &AppState, session: &SessionState, article_id: &str) -> ActionResult<bool> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, KNOWLEDGE_BASE, article_id) {
        Ok(v) => v,
        Err(_) => return action_err("Article not found"),
    };
    if !org_id_matches(&current, &org_id) {
        return action_err("Article not found");
    }
    match delete_doc_by_id(app, KNOWLEDGE_BASE, article_id) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}
