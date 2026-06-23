use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OfflineUser {
    pub id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    pub email: String,
    pub password_hash: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub first_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub company_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Value>,
    pub created_at: i64,
}

impl OfflineUser {
    pub fn without_password(&self) -> OfflineUserSafe {
        OfflineUserSafe {
            id: self.id.clone(),
            username: self.username.clone(),
            email: self.email.clone(),
            first_name: self.first_name.clone(),
            last_name: self.last_name.clone(),
            company_id: self.company_id.clone(),
            metadata: self.metadata.clone(),
            created_at: self.created_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OfflineUserSafe {
    pub id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    pub email: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub first_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub company_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Value>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicProfile {
    pub id: String,
    pub email: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub company_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub company_name: Option<String>,
    pub display_name: String,
    pub initials: String,
    pub login_identifier: String,
}

impl PublicProfile {
    pub fn from_user(user: &OfflineUser) -> Self {
        let display_name = format!(
            "{} {}",
            user.first_name.clone().unwrap_or_default(),
            user.last_name.clone().unwrap_or_default()
        )
        .trim()
        .to_string();

        let display_name = if display_name.is_empty() {
            user.username
                .clone()
                .unwrap_or_else(|| user.email.split('@').next().unwrap_or("User").to_string())
        } else {
            display_name
        };

        let initials: String = display_name
            .split_whitespace()
            .filter_map(|p| p.chars().next())
            .take(2)
            .collect::<String>()
            .to_uppercase();

        let company_name = user
            .metadata
            .as_ref()
            .and_then(|m| m.get("companyName"))
            .and_then(|v| v.as_str())
            .map(str::to_string);

        Self {
            id: user.id.clone(),
            email: user.email.clone(),
            username: user.username.clone(),
            first_name: user.first_name.clone(),
            last_name: user.last_name.clone(),
            company_id: user.company_id.clone(),
            company_name,
            display_name,
            initials,
            login_identifier: user.username.clone().unwrap_or_else(|| user.email.clone()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredSession {
    pub user_id: String,
    pub email: String,
    pub timestamp: i64,
}

const FALLBACK_COMPANY_ID: &str = "000000000000000000000001";

const ALL_MODULES: &[&str] = &[
    "dashboard", "finance", "inventory", "procurement", "hr", "tasks", "crm", "it", "helpdesk",
    "currency", "audit", "admin", "reports", "logs", "notifications", "payroll", "pos", "cashier",
];

/// Session user object for the React UI (`offlineUserToSessionUser`).
pub fn session_like_user(user: &OfflineUser) -> Value {
    let meta = user.metadata.clone().unwrap_or_else(|| json!({}));
    let first_name = user
        .first_name
        .clone()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| {
            user.email
                .split('@')
                .next()
                .unwrap_or("User")
                .to_string()
        });
    let last_name = user.last_name.clone().unwrap_or_default();
    let full_name = if last_name.trim().is_empty() {
        first_name.clone()
    } else {
        format!("{first_name} {last_name}")
    };

    let company_owner_id = meta
        .get("companyOwnerId")
        .and_then(|v| v.as_str())
        .map(str::to_string);
    let role = meta
        .get("role")
        .and_then(|v| v.as_str())
        .unwrap_or("user")
        .to_string();
    let is_owner = role.as_str() == "owner"
        || company_owner_id
            .as_ref()
            .map(|id| id == &user.id)
            .unwrap_or(false);

    let company_id = user
        .company_id
        .clone()
        .or_else(|| meta.get("companyId").and_then(|v| v.as_str()).map(str::to_string))
        .or_else(|| {
            meta.get("pendingCompanyId")
                .and_then(|v| v.as_str())
                .map(str::to_string)
        })
        .unwrap_or_else(|| FALLBACK_COMPANY_ID.to_string());

    let company_name = meta
        .get("companyName")
        .and_then(|v| v.as_str())
        .or_else(|| meta.get("pendingCompanyName").and_then(|v| v.as_str()))
        .unwrap_or("Company")
        .to_string();

    let allowed_modules = if is_owner {
        Value::Array(ALL_MODULES.iter().map(|m| json!(m)).collect())
    } else {
        meta.get("allowedModules").cloned().unwrap_or_else(|| json!(["dashboard"]))
    };

    let image_url = meta
        .get("imageUrl")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let mut public_metadata = meta.clone();
    if let Some(obj) = public_metadata.as_object_mut() {
        obj.insert(
            "role".into(),
            json!(if is_owner { "owner" } else { role.as_str() }),
        );
        obj.insert(
            "companyOwnerId".into(),
            json!(company_owner_id.unwrap_or_else(|| if is_owner { user.id.clone() } else { String::new() })),
        );
        obj.insert(
            "onCompleteSetup".into(),
            json!(obj.get("onCompleteSetup").unwrap_or(&json!(true))),
        );
        obj.insert("companyId".into(), json!(company_id));
        obj.insert("companyName".into(), json!(company_name.as_str()));
        obj.insert("allowedModules".into(), allowed_modules);
    }

    json!({
        "id": user.id,
        "firstName": first_name,
        "lastName": last_name,
        "fullName": full_name,
        "imageUrl": image_url,
        "emailAddresses": [{ "emailAddress": user.email }],
        "publicMetadata": public_metadata,
        "privateMetadata": {},
    })
}

pub fn make_user_id() -> String {
    format!(
        "offline_{}_{}",
        chrono_timestamp_ms(),
        random_suffix()
    )
}

pub fn make_object_id() -> String {
    let mut bytes = [0u8; 12];
    let _ = getrandom::getrandom(&mut bytes);
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn chrono_timestamp_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn random_suffix() -> String {
    let mut bytes = [0u8; 6];
    let _ = getrandom::getrandom(&mut bytes);
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}
