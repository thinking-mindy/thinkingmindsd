use serde_json::{json, Map, Value};

use crate::admin::access::{doc_id, find_doc_index, org_id_matches, session_org, value_as_id};
use crate::admin::service::ActionResult;
use crate::auth::models::make_object_id;
use crate::auth::session::SessionState;
use crate::state::AppState;
use crate::store_util::{
    action_err, action_ok, delete_doc_by_id, doc_created_ms, get_doc, insert_org_doc, iso_now, read_org_docs,
    update_doc_by_id,
};

const PROJECTS: &str = "projects";
const TASKS: &str = "tasks";
const USERS: &str = "users";

pub fn get_org_members_for_tasks(app: &AppState, session: &SessionState) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(_) => return action_ok(Vec::new()),
    };

    let rows = read_org_docs(app, USERS, &org_id).unwrap_or_default();
    let data = rows
        .into_iter()
        .map(|row| {
            let id = row
                .get("id")
                .or_else(|| row.get("clerkId"))
                .and_then(value_as_id)
                .or_else(|| doc_id(&row))
                .unwrap_or_default();
            let email = row
                .get("email")
                .or_else(|| row.get("email_address"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let meta = row
                .get("metadata")
                .or_else(|| row.get("public_metadata"))
                .or_else(|| row.get("publicMetadata"))
                .and_then(|v| v.as_object())
                .cloned()
                .unwrap_or_default();
            let first = meta
                .get("firstName")
                .or_else(|| meta.get("first_name"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let last = meta
                .get("lastName")
                .or_else(|| meta.get("last_name"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let name = {
                let combined = format!("{first} {last}").trim().to_string();
                if combined.is_empty() {
                    if !email.is_empty() {
                        email.clone()
                    } else {
                        id.clone()
                    }
                } else {
                    combined
                }
            };
            json!({ "id": id, "email": email, "name": name })
        })
        .collect::<Vec<_>>();

    action_ok(data)
}

pub fn create_project(app: &AppState, session: &SessionState, data: Value) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut payload = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid project payload"),
    };
    payload.remove("_id");
    payload.remove("projectId");
    payload.insert("orgId".into(), json!(org_id.clone()));
    payload.insert("createdAt".into(), json!(iso_now()));
    payload.insert("updatedAt".into(), json!(iso_now()));

    let inserted = match insert_org_doc(app, PROJECTS, &org_id, payload) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let project_id = doc_id(&inserted).unwrap_or_else(make_object_id);

    let mut patch = Map::new();
    patch.insert("projectId".into(), json!(project_id));
    match update_doc_by_id(app, PROJECTS, &project_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(inserted),
        Err(_) => action_ok(inserted),
    }
}

pub fn get_project(app: &AppState, session: &SessionState, project_id: &str) -> ActionResult<Value> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    match get_doc(app, PROJECTS, project_id) {
        Ok(v) => action_ok(v),
        Err(_) => action_ok(Value::Null),
    }
}

pub fn get_projects_by_org(app: &AppState, session: &SessionState, org_id: &str) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, PROJECTS, org_id).unwrap_or_default();
    rows.sort_by(|a, b| doc_created_ms(b).cmp(&doc_created_ms(a)));
    action_ok(rows)
}

pub fn get_projects_for_current_org(
    app: &AppState,
    session: &SessionState,
    limit: usize,
) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, PROJECTS, &org_id).unwrap_or_default();
    rows.sort_by(|a, b| doc_created_ms(b).cmp(&doc_created_ms(a)));
    rows.truncate(limit);
    action_ok(rows)
}

pub fn get_projects_by_status(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
    status: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, PROJECTS, org_id)
        .unwrap_or_default()
        .into_iter()
        .filter(|row| row.get("status").and_then(|v| v.as_str()) == Some(status))
        .collect::<Vec<_>>();
    rows.sort_by(|a, b| doc_created_ms(b).cmp(&doc_created_ms(a)));
    action_ok(rows)
}

pub fn update_project(
    app: &AppState,
    session: &SessionState,
    project_id: &str,
    data: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, PROJECTS, project_id) {
        Ok(v) => v,
        Err(_) => return action_err("Project not found"),
    };
    if !org_id_matches(&current, &org_id) {
        return action_err("Project not found");
    }
    let mut patch = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid project patch"),
    };
    patch.remove("_id");
    patch.remove("orgId");
    patch.remove("createdAt");
    patch.insert("updatedAt".into(), json!(iso_now()));
    match update_doc_by_id(app, PROJECTS, project_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(Value::Null),
        Err(e) => action_err(e),
    }
}

pub fn add_member_to_project(
    app: &AppState,
    session: &SessionState,
    project_id: &str,
    user_id: &str,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, PROJECTS, project_id) {
        Ok(v) => v,
        Err(_) => return action_err("Project not found"),
    };
    if !org_id_matches(&current, &org_id) {
        return action_err("Project not found");
    }
    let mut members = current
        .get("members")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    if !members
        .iter()
        .any(|m| value_as_id(m).as_deref() == Some(user_id) || m.as_str() == Some(user_id))
    {
        members.push(json!(user_id));
    }
    let mut patch = Map::new();
    patch.insert("members".into(), Value::Array(members));
    patch.insert("updatedAt".into(), json!(iso_now()));
    match update_doc_by_id(app, PROJECTS, project_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(Value::Null),
        Err(e) => action_err(e),
    }
}

pub fn delete_project(app: &AppState, session: &SessionState, project_id: &str) -> ActionResult<bool> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, PROJECTS, project_id) {
        Ok(v) => v,
        Err(_) => return action_err("Project not found"),
    };
    if !org_id_matches(&current, &org_id) {
        return action_err("Project not found");
    }
    match delete_doc_by_id(app, PROJECTS, project_id) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}

pub fn create_task(app: &AppState, session: &SessionState, data: Value) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut payload = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid task payload"),
    };
    payload.remove("_id");
    payload.remove("taskId");
    payload.insert("orgId".into(), json!(org_id.clone()));
    payload.insert("createdAt".into(), json!(iso_now()));
    payload.insert("updatedAt".into(), json!(iso_now()));

    let inserted = match insert_org_doc(app, TASKS, &org_id, payload) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let task_id = doc_id(&inserted).unwrap_or_else(make_object_id);
    let mut patch = Map::new();
    patch.insert("taskId".into(), json!(task_id));
    match update_doc_by_id(app, TASKS, &task_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(inserted),
        Err(_) => action_ok(inserted),
    }
}

pub fn get_task(app: &AppState, session: &SessionState, task_id: &str) -> ActionResult<Value> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    match get_doc(app, TASKS, task_id) {
        Ok(v) => action_ok(v),
        Err(_) => action_ok(Value::Null),
    }
}

pub fn get_tasks_by_project(
    app: &AppState,
    session: &SessionState,
    project_id: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = store_by_collection(app, TASKS)
        .into_iter()
        .filter(|row| {
            row.get("projectId")
                .and_then(value_as_id)
                .as_deref()
                == Some(project_id)
                || row.get("projectId").and_then(|v| v.as_str()) == Some(project_id)
        })
        .collect::<Vec<_>>();
    rows.sort_by(|a, b| doc_created_ms(b).cmp(&doc_created_ms(a)));
    action_ok(rows)
}

pub fn get_tasks_by_org(app: &AppState, session: &SessionState, org_id: &str) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, TASKS, org_id).unwrap_or_default();
    rows.sort_by(|a, b| doc_created_ms(b).cmp(&doc_created_ms(a)));
    action_ok(rows)
}

pub fn get_tasks_for_current_org(app: &AppState, session: &SessionState, limit: usize) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, TASKS, &org_id).unwrap_or_default();
    rows.sort_by(|a, b| doc_created_ms(b).cmp(&doc_created_ms(a)));
    rows.truncate(limit);
    action_ok(rows)
}

pub fn get_tasks_by_assigned(
    app: &AppState,
    session: &SessionState,
    user_id: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = store_by_collection(app, TASKS)
        .into_iter()
        .filter(|row| {
            row.get("assignedTo")
                .and_then(value_as_id)
                .as_deref()
                == Some(user_id)
                || row.get("assignedTo").and_then(|v| v.as_str()) == Some(user_id)
        })
        .collect::<Vec<_>>();
    rows.sort_by(|a, b| {
        let ad = a.get("dueDate").and_then(|v| v.as_str()).unwrap_or("");
        let bd = b.get("dueDate").and_then(|v| v.as_str()).unwrap_or("");
        ad.cmp(bd)
    });
    action_ok(rows)
}

pub fn get_tasks_by_status(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
    status: &str,
) -> ActionResult<Vec<Value>> {
    let _ = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, TASKS, org_id)
        .unwrap_or_default()
        .into_iter()
        .filter(|row| row.get("status").and_then(|v| v.as_str()) == Some(status))
        .collect::<Vec<_>>();
    rows.sort_by(|a, b| doc_created_ms(b).cmp(&doc_created_ms(a)));
    action_ok(rows)
}

pub fn update_task(app: &AppState, session: &SessionState, task_id: &str, data: Value) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, TASKS, task_id) {
        Ok(v) => v,
        Err(_) => return action_err("Task not found"),
    };
    if !org_id_matches(&current, &org_id) {
        return action_err("Task not found");
    }
    let mut patch = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid task patch"),
    };
    patch.remove("_id");
    patch.remove("orgId");
    patch.remove("createdAt");
    patch.insert("updatedAt".into(), json!(iso_now()));
    match update_doc_by_id(app, TASKS, task_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_ok(Value::Null),
        Err(e) => action_err(e),
    }
}

pub fn delete_task(app: &AppState, session: &SessionState, task_id: &str) -> ActionResult<bool> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match get_doc(app, TASKS, task_id) {
        Ok(v) => v,
        Err(_) => return action_err("Task not found"),
    };
    if !org_id_matches(&current, &org_id) {
        return action_err("Task not found");
    }
    match delete_doc_by_id(app, TASKS, task_id) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}

const WORK_BOARD_CONFIG: &str = "work_board_config";

fn default_work_board_config() -> Value {
    json!({
        "taskColumns": [
            { "id": "todo", "label": "To do", "color": "#64748b", "category": "backlog" },
            { "id": "in_progress", "label": "In progress", "color": "#f59e0b", "category": "active" },
            { "id": "review", "label": "Review", "color": "#8b5cf6", "category": "active" },
            { "id": "done", "label": "Done", "color": "#0AA775", "category": "done" }
        ],
        "projectColumns": [
            { "id": "planning", "label": "Planning", "color": "#64748b", "category": "backlog" },
            { "id": "active", "label": "Active", "color": "#3b82f6", "category": "active" },
            { "id": "on_hold", "label": "On hold", "color": "#f59e0b", "category": "active" },
            { "id": "completed", "label": "Completed", "color": "#0AA775", "category": "done" },
            { "id": "cancelled", "label": "Cancelled", "color": "#ef4444", "category": "done" }
        ]
    })
}

pub fn get_work_board_config(app: &AppState, session: &SessionState) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let rows = read_org_docs(app, WORK_BOARD_CONFIG, &org_id).unwrap_or_default();
    if let Some(row) = rows.first() {
        return action_ok(json!({
            "taskColumns": row.get("taskColumns").cloned().unwrap_or_else(|| default_work_board_config().get("taskColumns").cloned().unwrap()),
            "projectColumns": row.get("projectColumns").cloned().unwrap_or_else(|| default_work_board_config().get("projectColumns").cloned().unwrap())
        }));
    }
    action_ok(default_work_board_config())
}

pub fn save_work_board_config(app: &AppState, session: &SessionState, data: Value) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut payload = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid board config"),
    };
    payload.insert("orgId".into(), json!(org_id.clone()));
    payload.insert("updatedAt".into(), json!(iso_now()));

    let rows = read_org_docs(app, WORK_BOARD_CONFIG, &org_id).unwrap_or_default();
    if let Some(existing) = rows.first() {
        let id = doc_id(existing).unwrap_or_else(make_object_id);
        let mut patch = payload;
        patch.remove("orgId");
        match update_doc_by_id(app, WORK_BOARD_CONFIG, &id, patch) {
            Ok(Some(v)) => action_ok(v),
            Ok(None) => action_err("Failed to save board config"),
            Err(e) => action_err(e),
        }
    } else {
        match insert_org_doc(app, WORK_BOARD_CONFIG, &org_id, payload) {
            Ok(v) => action_ok(v),
            Err(e) => action_err(e),
        }
    }
}

pub fn migrate_task_statuses(
    app: &AppState,
    session: &SessionState,
    from_status: &str,
    to_status: &str,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, TASKS, &org_id).unwrap_or_default();
    let mut modified = 0u64;
    for row in rows.iter_mut() {
        if row.get("status").and_then(|v| v.as_str()) == Some(from_status) {
            if let Some(obj) = row.as_object_mut() {
                obj.insert("status".into(), json!(to_status));
                obj.insert("updatedAt".into(), json!(iso_now()));
                modified += 1;
            }
        }
    }
    if modified > 0 {
        let _ = crate::db::store::write_collection(
            &app.db_dir(),
            crate::db::DB_NAME,
            TASKS,
            &rows,
        );
    }
    action_ok(json!({ "modified": modified }))
}

pub fn migrate_project_statuses(
    app: &AppState,
    session: &SessionState,
    from_status: &str,
    to_status: &str,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = read_org_docs(app, PROJECTS, &org_id).unwrap_or_default();
    let mut modified = 0u64;
    for row in rows.iter_mut() {
        if row.get("status").and_then(|v| v.as_str()) == Some(from_status) {
            if let Some(obj) = row.as_object_mut() {
                obj.insert("status".into(), json!(to_status));
                obj.insert("updatedAt".into(), json!(iso_now()));
                modified += 1;
            }
        }
    }
    if modified > 0 {
        let _ = crate::db::store::write_collection(
            &app.db_dir(),
            crate::db::DB_NAME,
            PROJECTS,
            &rows,
        );
    }
    action_ok(json!({ "modified": modified }))
}

fn store_by_collection(app: &AppState, collection: &str) -> Vec<Value> {
    crate::db::store::read_collection(&app.db_dir(), crate::db::DB_NAME, collection).unwrap_or_default()
}

#[allow(dead_code)]
fn _exists_by_id(rows: &[Value], id: &str) -> bool {
    find_doc_index(rows, id).is_some()
}
