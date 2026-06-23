use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::admin::access::session_org;
use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::db::{self, store};
use crate::state::AppState;
use crate::store_util::{action_err, action_ok, iso_now};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserProfileInput {
    pub first_name: String,
    pub last_name: String,
    pub username: Option<String>,
    pub phone: Option<String>,
    pub image_url: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserProfileData {
    pub id: String,
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub company_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub company_name: Option<String>,
}

pub fn get_current_user_profile(
    app: &AppState,
    session: &SessionState,
) -> ActionResult<UserProfileData> {
    let (user, company_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let docs = match store::read_collection(&app.db_dir(), db::DB_NAME, "users") {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let row = docs.into_iter().find(|d| {
        d.get("clerkId").and_then(|v| v.as_str()) == Some(user.id.as_str())
            || d.get("id").and_then(|v| v.as_str()) == Some(user.id.as_str())
    });

    let user_meta = user.metadata.unwrap_or_else(|| json!({}));
    let doc_meta = row
        .as_ref()
        .and_then(|d| d.get("metadata"))
        .cloned()
        .unwrap_or_else(|| json!({}));

    let first_name = clean_opt(
        user.first_name
            .or_else(|| row.as_ref().and_then(|d| d.get("firstName")).and_then(|v| v.as_str().map(str::to_string))),
    );
    let last_name = clean_opt(
        user.last_name
            .or_else(|| row.as_ref().and_then(|d| d.get("lastName")).and_then(|v| v.as_str().map(str::to_string))),
    );
    let username = clean_opt(
        row.as_ref()
            .and_then(|d| d.get("username"))
            .and_then(|v| v.as_str().map(str::to_string))
            .or_else(|| doc_meta.get("username").and_then(|v| v.as_str().map(str::to_string))),
    );
    let phone = clean_opt(
        row.as_ref()
            .and_then(|d| d.get("phone"))
            .and_then(|v| v.as_str().map(str::to_string))
            .or_else(|| doc_meta.get("phone").and_then(|v| v.as_str().map(str::to_string))),
    );
    let image_url = clean_opt(
        user_meta
            .get("imageUrl")
            .and_then(|v| v.as_str().map(str::to_string))
            .or_else(|| doc_meta.get("imageUrl").and_then(|v| v.as_str().map(str::to_string))),
    );
    let email = row
        .as_ref()
        .and_then(|d| d.get("email").and_then(|v| v.as_str()))
        .map(str::to_string)
        .unwrap_or_else(|| user.email.clone());
    let role = user_meta
        .get("role")
        .and_then(|v| v.as_str())
        .map(str::to_string)
        .or_else(|| row.as_ref().and_then(|d| d.get("role")).and_then(|v| v.as_str().map(str::to_string)));
    let company_name = user_meta
        .get("companyName")
        .and_then(|v| v.as_str().map(str::to_string))
        .or_else(|| doc_meta.get("companyName").and_then(|v| v.as_str().map(str::to_string)));

    action_ok(UserProfileData {
        id: user.id,
        email,
        first_name: first_name.unwrap_or_default(),
        last_name: last_name.unwrap_or_default(),
        username,
        phone,
        image_url,
        role,
        company_id: Some(company_id),
        company_name,
    })
}

pub fn update_current_user_profile(
    app: &AppState,
    session: &SessionState,
    input: UserProfileInput,
) -> ActionResult<UserProfileData> {
    let (user, company_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let first_name = clean(input.first_name);
    if first_name.is_empty() {
        return action_err("First name is required");
    }
    let last_name = clean(input.last_name);
    let username = clean(input.username.unwrap_or_default());
    let phone = clean(input.phone.unwrap_or_default());
    let image_url = clean(input.image_url.unwrap_or_default());

    let mut users = match store::read_collection(&app.db_dir(), db::DB_NAME, "users") {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    if !username.is_empty() {
        let taken = users.iter().any(|row| {
            row.get("username")
                .and_then(|v| v.as_str())
                .map(|u| u.eq_ignore_ascii_case(username.as_str()))
                .unwrap_or(false)
                && row.get("clerkId").and_then(|v| v.as_str()) != Some(user.id.as_str())
                && row.get("id").and_then(|v| v.as_str()) != Some(user.id.as_str())
        });
        if taken {
            return action_err("Username is already taken");
        }
    }

    let full_name = {
        let built = format!("{first_name} {last_name}").trim().to_string();
        if built.is_empty() {
            user.email
                .split('@')
                .next()
                .unwrap_or("User")
                .to_string()
        } else {
            built
        }
    };

    let user_meta = user.metadata.unwrap_or_else(|| json!({}));
    let role = user_meta
        .get("role")
        .and_then(|v| v.as_str())
        .unwrap_or("user")
        .to_string();
    let company_name = user_meta
        .get("companyName")
        .and_then(|v| v.as_str())
        .map(str::to_string);

    let mut profile_meta = user_meta;
    if let Some(obj) = profile_meta.as_object_mut() {
        if !phone.is_empty() {
            obj.insert("phone".into(), json!(phone));
        }
        if !image_url.is_empty() {
            obj.insert("imageUrl".into(), json!(image_url));
        }
        if !username.is_empty() {
            obj.insert("username".into(), json!(username));
        }
    }

    if let Some(idx) = users.iter().position(|row| {
        row.get("clerkId").and_then(|v| v.as_str()) == Some(user.id.as_str())
            || row.get("id").and_then(|v| v.as_str()) == Some(user.id.as_str())
    }) {
        if let Some(obj) = users[idx].as_object_mut() {
            obj.insert("clerkId".into(), json!(user.id));
            obj.insert("id".into(), json!(user.id));
            obj.insert("email".into(), json!(user.email));
            obj.insert("firstName".into(), json!(first_name));
            obj.insert("lastName".into(), json!(last_name));
            obj.insert("fullName".into(), json!(full_name));
            if !username.is_empty() {
                obj.insert("username".into(), json!(username));
            }
            if !phone.is_empty() {
                obj.insert("phone".into(), json!(phone));
            }
            obj.insert("role".into(), json!(role));
            obj.insert("metadata".into(), profile_meta.clone());
            obj.insert("orgId".into(), json!(company_id));
            obj.insert("updatedAt".into(), json!(iso_now()));
        }
    } else {
        users.push(json!({
            "_id": crate::auth::models::make_object_id(),
            "clerkId": user.id,
            "id": user.id,
            "email": user.email,
            "firstName": first_name,
            "lastName": last_name,
            "fullName": full_name,
            "username": if username.is_empty() { Value::Null } else { json!(username.clone()) },
            "phone": if phone.is_empty() { Value::Null } else { json!(phone.clone()) },
            "role": role,
            "metadata": profile_meta.clone(),
            "orgId": company_id,
            "createdAt": iso_now(),
            "updatedAt": iso_now(),
        }));
    }

    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, "users", &users) {
        return action_err(e);
    }

    action_ok(UserProfileData {
        id: user.id,
        email: user.email,
        first_name,
        last_name,
        username: opt_non_empty(username),
        phone: opt_non_empty(phone),
        image_url: opt_non_empty(image_url),
        role: Some(role),
        company_id: Some(company_id),
        company_name,
    })
}

pub fn get_profile_display_name(
    app: &AppState,
    session: &SessionState,
) -> Result<String, String> {
    let profile = get_current_user_profile(app, session);
    if !profile.success {
        return Ok("User".into());
    }
    let Some(data) = profile.data else {
        return Ok("User".into());
    };
    let full = format!("{} {}", data.first_name, data.last_name).trim().to_string();
    if !full.is_empty() {
        return Ok(full);
    }
    if let Some(username) = data.username {
        if !username.trim().is_empty() {
            return Ok(username);
        }
    }
    Ok(data
        .email
        .split('@')
        .next()
        .unwrap_or("User")
        .to_string())
}

fn clean(value: String) -> String {
    value.trim().to_string()
}

fn clean_opt(value: Option<String>) -> Option<String> {
    value.map(clean).filter(|v| !v.is_empty())
}

fn opt_non_empty(value: String) -> Option<String> {
    let v = clean(value);
    if v.is_empty() {
        None
    } else {
        Some(v)
    }
}
