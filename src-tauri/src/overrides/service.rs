use serde::Serialize;
use serde_json::{json, Value};

use crate::admin::access::session_org;
use crate::admin::service::ActionResult;
use crate::auth::models::make_object_id;
use crate::auth::session::SessionState;
use crate::db::{self, store};
use crate::state::AppState;
use crate::store_util::{action_err, action_ok, iso_now};

const COLLECTION_PROJECTS: &str = "company_projects";
const COLLECTION_FILES: &str = "company_files";
const COLLECTION_VERSIONS: &str = "company_file_versions";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnsureProjectData {
    pub project_id: String,
}

#[derive(Serialize)]
pub struct ListOverrideFilesData {
    pub files: Vec<Value>,
}

#[derive(Serialize)]
pub struct GetOverrideFileData {
    pub file: Option<Value>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveOverrideData {
    pub content: String,
    pub source: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellCommandData {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

pub fn ensure_overrides_project(
    app: &AppState,
    session: &SessionState,
) -> ActionResult<EnsureProjectData> {
    let (_user, company_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut projects =
        match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION_PROJECTS) {
            Ok(v) => v,
            Err(e) => return action_err(e),
        };

    if let Some(existing_id) = projects
        .iter()
        .find(|row| {
            row.get("companyId").and_then(|v| v.as_str()) == Some(company_id.as_str())
                && row.get("type").and_then(|v| v.as_str()) == Some("overrides")
        })
        .and_then(|row| row.get("_id").and_then(|v| v.as_str()))
        .map(str::to_string)
    {
        return action_ok(EnsureProjectData {
            project_id: existing_id,
        });
    }

    let now = iso_now();
    let project_id = make_object_id();
    projects.push(json!({
        "_id": project_id,
        "companyId": company_id,
        "type": "overrides",
        "name": "Overrides",
        "createdAt": now,
        "updatedAt": now,
    }));

    if let Err(e) =
        store::write_collection(&app.db_dir(), db::DB_NAME, COLLECTION_PROJECTS, &projects)
    {
        return action_err(e);
    }

    action_ok(EnsureProjectData { project_id })
}

pub fn list_override_files(app: &AppState, session: &SessionState) -> ActionResult<ListOverrideFilesData> {
    let (_user, company_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let projects =
        match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION_PROJECTS) {
            Ok(v) => v,
            Err(e) => return action_err(e),
        };
    let Some(project_id) = projects
        .iter()
        .find(|row| {
            row.get("companyId").and_then(|v| v.as_str()) == Some(company_id.as_str())
                && row.get("type").and_then(|v| v.as_str()) == Some("overrides")
        })
        .and_then(|row| row.get("_id").and_then(|v| v.as_str()))
    else {
        return action_ok(ListOverrideFilesData { files: vec![] });
    };

    let mut files = match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION_FILES) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    files.retain(|row| {
        row.get("companyId").and_then(|v| v.as_str()) == Some(company_id.as_str())
            && row.get("projectId").and_then(|v| v.as_str()) == Some(project_id)
    });
    files.sort_by(|a, b| {
        a.get("path")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .cmp(b.get("path").and_then(|v| v.as_str()).unwrap_or(""))
    });

    let mapped = files
        .into_iter()
        .map(|f| {
            json!({
                "id": f.get("_id").and_then(|v| v.as_str()).unwrap_or_default(),
                "path": f.get("path").and_then(|v| v.as_str()).unwrap_or_default(),
                "updatedAt": f
                    .get("updatedAt")
                    .and_then(|v| v.as_str())
                    .map(str::to_string)
                    .unwrap_or_else(iso_now),
                "contentType": f.get("contentType").and_then(|v| v.as_str()).unwrap_or("text/plain"),
            })
        })
        .collect();

    action_ok(ListOverrideFilesData { files: mapped })
}

pub fn get_override_file(
    app: &AppState,
    session: &SessionState,
    path: &str,
) -> ActionResult<GetOverrideFileData> {
    let (_user, company_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let projects =
        match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION_PROJECTS) {
            Ok(v) => v,
            Err(e) => return action_err(e),
        };
    let Some(project_id) = projects
        .iter()
        .find(|row| {
            row.get("companyId").and_then(|v| v.as_str()) == Some(company_id.as_str())
                && row.get("type").and_then(|v| v.as_str()) == Some("overrides")
        })
        .and_then(|row| row.get("_id").and_then(|v| v.as_str()))
    else {
        return action_ok(GetOverrideFileData { file: None });
    };

    let files = match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION_FILES) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let file = files.into_iter().find(|row| {
        row.get("companyId").and_then(|v| v.as_str()) == Some(company_id.as_str())
            && row.get("projectId").and_then(|v| v.as_str()) == Some(project_id)
            && row.get("path").and_then(|v| v.as_str()) == Some(path)
    });

    let mapped = file.map(|f| {
        json!({
            "path": f.get("path").and_then(|v| v.as_str()).unwrap_or_default(),
            "content": f.get("content").and_then(|v| v.as_str()).unwrap_or_default(),
            "contentType": f.get("contentType").and_then(|v| v.as_str()).unwrap_or("text/plain"),
            "updatedAt": f
                .get("updatedAt")
                .and_then(|v| v.as_str())
                .map(str::to_string)
                .unwrap_or_else(iso_now),
        })
    });

    action_ok(GetOverrideFileData { file: mapped })
}

pub fn upsert_override_file(
    app: &AppState,
    session: &SessionState,
    path: &str,
    content: &str,
    content_type: Option<String>,
) -> ActionResult<()> {
    let (user, company_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let ensure = ensure_overrides_project(app, session);
    if !ensure.success {
        return action_err(
            ensure
                .error
                .unwrap_or_else(|| "Failed to ensure overrides project".to_string()),
        );
    }
    let Some(project_id) = ensure.data.map(|v| v.project_id) else {
        return action_err("Failed to resolve project");
    };

    let now = iso_now();
    let mut files = match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION_FILES) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut versions =
        match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION_VERSIONS) {
            Ok(v) => v,
            Err(e) => return action_err(e),
        };

    if let Some(existing) = files.iter().find(|row| {
        row.get("companyId").and_then(|v| v.as_str()) == Some(company_id.as_str())
            && row.get("projectId").and_then(|v| v.as_str()) == Some(project_id.as_str())
            && row.get("path").and_then(|v| v.as_str()) == Some(path)
    }) {
        versions.push(json!({
            "_id": make_object_id(),
            "companyId": company_id,
            "projectId": project_id,
            "fileId": existing.get("_id").and_then(|v| v.as_str()).unwrap_or_default(),
            "path": existing.get("path").and_then(|v| v.as_str()).unwrap_or_default(),
            "content": existing.get("content").and_then(|v| v.as_str()).unwrap_or_default(),
            "contentType": existing.get("contentType").and_then(|v| v.as_str()).unwrap_or("text/plain"),
            "createdAt": now,
            "createdBy": user.id,
        }));
    }

    let resolved_content_type = content_type.unwrap_or_else(|| infer_content_type(path));
    if let Some(idx) = files.iter().position(|row| {
        row.get("companyId").and_then(|v| v.as_str()) == Some(company_id.as_str())
            && row.get("projectId").and_then(|v| v.as_str()) == Some(project_id.as_str())
            && row.get("path").and_then(|v| v.as_str()) == Some(path)
    }) {
        if let Some(obj) = files[idx].as_object_mut() {
            obj.insert("content".into(), json!(content));
            obj.insert("contentType".into(), json!(resolved_content_type));
            obj.insert("updatedAt".into(), json!(iso_now()));
            obj.insert("updatedBy".into(), json!(user.id));
        }
    } else {
        files.push(json!({
            "_id": make_object_id(),
            "companyId": company_id,
            "projectId": project_id,
            "path": path,
            "content": content,
            "contentType": resolved_content_type,
            "updatedAt": now,
            "updatedBy": user.id,
            "createdAt": now,
        }));
    }

    let mut projects =
        match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION_PROJECTS) {
            Ok(v) => v,
            Err(e) => return action_err(e),
        };
    if let Some(project) = projects.iter_mut().find(|row| {
        row.get("_id").and_then(|v| v.as_str()) == Some(project_id.as_str())
    }) {
        if let Some(obj) = project.as_object_mut() {
            obj.insert("updatedAt".into(), json!(iso_now()));
        }
    }

    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, COLLECTION_VERSIONS, &versions) {
        return action_err(e);
    }
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, COLLECTION_FILES, &files) {
        return action_err(e);
    }
    if let Err(e) =
        store::write_collection(&app.db_dir(), db::DB_NAME, COLLECTION_PROJECTS, &projects)
    {
        return action_err(e);
    }
    action_ok(())
}

pub fn delete_override_file(app: &AppState, session: &SessionState, path: &str) -> ActionResult<()> {
    let (_user, company_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let projects =
        match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION_PROJECTS) {
            Ok(v) => v,
            Err(e) => return action_err(e),
        };
    let Some(project_id) = projects
        .iter()
        .find(|row| {
            row.get("companyId").and_then(|v| v.as_str()) == Some(company_id.as_str())
                && row.get("type").and_then(|v| v.as_str()) == Some("overrides")
        })
        .and_then(|row| row.get("_id").and_then(|v| v.as_str()))
    else {
        return action_ok(());
    };

    let mut files = match store::read_collection(&app.db_dir(), db::DB_NAME, COLLECTION_FILES) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    files.retain(|row| {
        !(row.get("companyId").and_then(|v| v.as_str()) == Some(company_id.as_str())
            && row.get("projectId").and_then(|v| v.as_str()) == Some(project_id)
            && row.get("path").and_then(|v| v.as_str()) == Some(path))
    });
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, COLLECTION_FILES, &files) {
        return action_err(e);
    }
    action_ok(())
}

pub fn resolve_override_or_default(
    app: &AppState,
    session: &SessionState,
    path: &str,
    default_content: &str,
) -> ActionResult<ResolveOverrideData> {
    let res = get_override_file(app, session, path);
    if res.success {
        if let Some(file) = res.data.and_then(|d| d.file) {
            if let Some(content) = file.get("content").and_then(|v| v.as_str()) {
                return action_ok(ResolveOverrideData {
                    content: content.to_string(),
                    source: "override".into(),
                });
            }
        }
    }
    action_ok(ResolveOverrideData {
        content: default_content.to_string(),
        source: "default".into(),
    })
}

pub fn run_company_shell_command(
    _app: &AppState,
    _session: &SessionState,
    _input: &str,
) -> ActionResult<ShellCommandData> {
    action_err("Shell commands are disabled in desktop app")
}

fn infer_content_type(path: &str) -> String {
    let lower = path.to_ascii_lowercase();
    if lower.ends_with(".json") {
        return "application/json".into();
    }
    if lower.ends_with(".md") {
        return "text/markdown".into();
    }
    if lower.ends_with(".hbs") {
        return "text/x-handlebars-template".into();
    }
    "text/plain".into()
}
