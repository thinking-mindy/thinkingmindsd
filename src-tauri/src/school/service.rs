use std::collections::{HashMap, HashSet};

use serde_json::{json, Map, Value};

use crate::admin::access::{doc_id, find_doc_index, org_id_matches, session_org, value_as_id};
use crate::admin::service::ActionResult;
use crate::auth::models::make_object_id;
use crate::auth::session::SessionState;
use crate::db::{self, store};
use crate::school::school_term::compute_term_fee_balance;
use crate::state::AppState;
use crate::store_util::{action_err, action_ok, iso_now, now_ms, parse_iso_ms, read_org_docs};

const SETTINGS: &str = "school_settings";
const CLASSES: &str = "school_classes";
const STUDENTS: &str = "school_students";
const CASHIER_TRANSACTIONS: &str = "cashier_transactions";

const EDUCATION_LEVELS: [&str; 3] = ["primary", "high_school", "tertiary"];
const DEFAULT_LEVEL: &str = "primary";
const LETTERS: &str = "ABCDEFGHJKLMNPQRSTUVWXYZ";

pub fn get_school_settings(
    app: &AppState,
    session: &SessionState,
    org_id_override: Option<&str>,
) -> ActionResult<Value> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let org_id = org_id_override.unwrap_or(&session_org_id);
    match load_school_settings(app, org_id) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}

pub fn update_school_settings(
    app: &AppState,
    session: &SessionState,
    input: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let input_obj = match input.as_object() {
        Some(v) => v,
        None => return action_err("Invalid settings payload"),
    };
    let enabled_levels = normalize_levels(input_obj.get("enabledLevels"));
    if enabled_levels.is_empty() {
        return action_err("Enable at least one education level");
    }
    let requested_default = input_obj
        .get("defaultLevel")
        .and_then(|v| v.as_str())
        .unwrap_or(DEFAULT_LEVEL);
    let default_level = if enabled_levels.iter().any(|l| l == requested_default) {
        requested_default.to_string()
    } else {
        enabled_levels[0].clone()
    };

    let mut doc = Map::new();
    doc.insert("orgId".into(), json!(org_id));
    doc.insert("enabledLevels".into(), json!(enabled_levels));
    doc.insert("defaultLevel".into(), json!(default_level));
    if let Some(name) = input_obj
        .get("institutionName")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        doc.insert("institutionName".into(), json!(name));
    }
    doc.insert("updatedAt".into(), json!(iso_now()));

    let mut docs = match store::read_collection(&app.db_dir(), db::DB_NAME, SETTINGS) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    if let Some(idx) = docs.iter().position(|d| org_id_matches(d, &org_id)) {
        if let Some(existing_id) = docs[idx].get("_id").cloned() {
            doc.insert("_id".into(), existing_id);
        }
        if let Some(created_at) = docs[idx].get("createdAt").cloned() {
            doc.insert("createdAt".into(), created_at);
        }
        docs[idx] = Value::Object(doc.clone());
    } else {
        doc.insert("_id".into(), json!(make_object_id()));
        doc.insert("createdAt".into(), json!(iso_now()));
        docs.push(Value::Object(doc.clone()));
    }
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, SETTINGS, &docs) {
        return action_err(e);
    }
    action_ok(Value::Object(doc))
}

pub fn get_school_classes(
    app: &AppState,
    session: &SessionState,
    org_id_override: Option<&str>,
    education_level: Option<&str>,
) -> ActionResult<Vec<Value>> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let org_id = org_id_override.unwrap_or(&session_org_id);

    let mut rows = match read_org_docs(app, CLASSES, org_id) {
        Ok(v) => v
            .into_iter()
            .filter(|d| match education_level {
                None => true,
                Some("primary") => {
                    d.get("educationLevel")
                        .and_then(|v| v.as_str())
                        .map(|l| l == "primary")
                        .unwrap_or(true)
                }
                Some(level) => d.get("educationLevel").and_then(|v| v.as_str()) == Some(level),
            })
            .map(normalize_class_education_level)
            .collect::<Vec<_>>(),
        Err(e) => return action_err(e),
    };
    rows.sort_by(|a, b| {
        let la = a
            .get("educationLevel")
            .and_then(|v| v.as_str())
            .unwrap_or(DEFAULT_LEVEL);
        let lb = b
            .get("educationLevel")
            .and_then(|v| v.as_str())
            .unwrap_or(DEFAULT_LEVEL);
        la.cmp(lb).then_with(|| {
            let na = a.get("name").and_then(|v| v.as_str()).unwrap_or("");
            let nb = b.get("name").and_then(|v| v.as_str()).unwrap_or("");
            na.cmp(nb)
        })
    });
    action_ok(rows)
}

pub fn create_school_class(app: &AppState, session: &SessionState, input: Value) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut obj = match input.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid class payload"),
    };
    let settings = match load_school_settings(app, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let default_level = settings
        .get("defaultLevel")
        .and_then(|v| v.as_str())
        .unwrap_or(DEFAULT_LEVEL);
    let level = resolve_education_level(
        obj.get("educationLevel").and_then(|v| v.as_str()),
        default_level,
    );
    obj.insert("_id".into(), json!(make_object_id()));
    obj.insert("orgId".into(), json!(org_id));
    obj.insert("educationLevel".into(), json!(level));
    obj.insert("createdAt".into(), json!(iso_now()));
    obj.insert("updatedAt".into(), json!(iso_now()));

    let mut docs = match store::read_collection(&app.db_dir(), db::DB_NAME, CLASSES) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    docs.push(Value::Object(obj.clone()));
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, CLASSES, &docs) {
        return action_err(e);
    }
    action_ok(Value::Object(obj))
}

pub fn update_school_class(
    app: &AppState,
    session: &SessionState,
    class_id: &str,
    input: Value,
) -> ActionResult<()> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let patch = match input.as_object() {
        Some(v) => v,
        None => return action_err("Invalid class patch"),
    };
    let mut docs = match store::read_collection(&app.db_dir(), db::DB_NAME, CLASSES) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let idx = match find_doc_index(&docs, class_id) {
        Some(v) => v,
        None => return action_err("Class not found"),
    };
    if !org_id_matches(&docs[idx], &org_id) {
        return action_err("Class not found");
    }
    if let Some(obj) = docs[idx].as_object_mut() {
        for (k, v) in patch {
            if k == "_id" || k == "orgId" || k == "createdAt" {
                continue;
            }
            if k == "educationLevel" {
                let level = resolve_education_level(v.as_str(), DEFAULT_LEVEL);
                obj.insert(k.clone(), json!(level));
            } else {
                obj.insert(k.clone(), v.clone());
            }
        }
        obj.insert("updatedAt".into(), json!(iso_now()));
    }
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, CLASSES, &docs) {
        return action_err(e);
    }
    action_ok(())
}

pub fn delete_school_class(
    app: &AppState,
    session: &SessionState,
    class_id: &str,
) -> ActionResult<()> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut docs = match store::read_collection(&app.db_dir(), db::DB_NAME, CLASSES) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let before = docs.len();
    docs.retain(|d| doc_id(d).as_deref() != Some(class_id) || !org_id_matches(d, &org_id));
    if docs.len() == before {
        return action_err("Class not found");
    }
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, CLASSES, &docs) {
        return action_err(e);
    }
    action_ok(())
}

pub fn get_school_students(
    app: &AppState,
    session: &SessionState,
    org_id_override: Option<&str>,
    status: Option<&str>,
) -> ActionResult<Vec<Value>> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let org_id = org_id_override.unwrap_or(&session_org_id);
    let mut rows = match read_org_docs(app, STUDENTS, org_id) {
        Ok(v) => v
            .into_iter()
            .filter(|d| match status {
                None | Some("all") => true,
                Some(s) => d.get("status").and_then(|v| v.as_str()) == Some(s),
            })
            .collect::<Vec<_>>(),
        Err(e) => return action_err(e),
    };
    rows.sort_by(|a, b| {
        let al = a.get("lastName").and_then(|v| v.as_str()).unwrap_or("");
        let bl = b.get("lastName").and_then(|v| v.as_str()).unwrap_or("");
        al.cmp(bl).then_with(|| {
            let af = a.get("firstName").and_then(|v| v.as_str()).unwrap_or("");
            let bf = b.get("firstName").and_then(|v| v.as_str()).unwrap_or("");
            af.cmp(bf)
        })
    });
    action_ok(rows)
}

pub fn get_school_student(
    app: &AppState,
    session: &SessionState,
    student_id: &str,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let docs = match read_org_docs(app, STUDENTS, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    match docs
        .into_iter()
        .find(|d| doc_id(d).as_deref() == Some(student_id))
    {
        Some(v) => action_ok(v),
        None => action_err("Student not found"),
    }
}

pub fn create_school_student(
    app: &AppState,
    session: &SessionState,
    input: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let input_obj = match input.as_object() {
        Some(v) => v,
        None => return action_err("Invalid student payload"),
    };
    let settings = match load_school_settings(app, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let default_level = settings
        .get("defaultLevel")
        .and_then(|v| v.as_str())
        .unwrap_or(DEFAULT_LEVEL);

    let mut class_name = input_obj
        .get("className")
        .and_then(|v| v.as_str())
        .map(str::to_string);
    let mut education_level = input_obj
        .get("educationLevel")
        .and_then(|v| v.as_str())
        .map(str::to_string);
    if let Some(class_id) = input_obj.get("classId").and_then(value_as_id) {
        if let Some(class_doc) = find_org_doc_by_id(app, CLASSES, &org_id, &class_id) {
            if class_name.is_none() {
                class_name = class_doc
                    .get("name")
                    .and_then(|v| v.as_str())
                    .map(str::to_string);
            }
            education_level = Some(resolve_education_level(
                class_doc
                    .get("educationLevel")
                    .and_then(|v| v.as_str())
                    .or(education_level.as_deref()),
                default_level,
            ));
        }
    }
    if education_level.is_none() {
        education_level = Some(default_level.to_string());
    }

    let first_name = match input_obj
        .get("firstName")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|v| !v.is_empty())
    {
        Some(v) => v.to_string(),
        None => return action_err("firstName is required"),
    };
    let last_name = match input_obj
        .get("lastName")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|v| !v.is_empty())
    {
        Some(v) => v.to_string(),
        None => return action_err("lastName is required"),
    };

    let student_number = match input_obj
        .get("studentNumber")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        Some(v) => v.to_uppercase(),
        None => match next_student_number(app, &org_id) {
            Ok(v) => v,
            Err(e) => return action_err(e),
        },
    };

    let mut doc = Map::new();
    doc.insert("_id".into(), json!(make_object_id()));
    doc.insert("orgId".into(), json!(org_id));
    doc.insert(
        "educationLevel".into(),
        json!(education_level.unwrap_or_else(|| DEFAULT_LEVEL.to_string())),
    );
    doc.insert("studentNumber".into(), json!(student_number));
    doc.insert("firstName".into(), json!(first_name));
    doc.insert("lastName".into(), json!(last_name));
    copy_if_present(&mut doc, input_obj, "classId");
    if let Some(name) = class_name {
        doc.insert("className".into(), json!(name));
    } else {
        copy_trimmed_if_present(&mut doc, input_obj, "className");
    }
    copy_trimmed_if_present(&mut doc, input_obj, "guardianName");
    copy_trimmed_if_present(&mut doc, input_obj, "guardianPhone");
    copy_trimmed_if_present(&mut doc, input_obj, "guardianEmail");
    copy_if_present(&mut doc, input_obj, "dateOfBirth");
    copy_if_present(&mut doc, input_obj, "gender");
    copy_trimmed_if_present(&mut doc, input_obj, "notes");
    doc.insert(
        "status".into(),
        json!(input_obj
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("active")),
    );
    doc.insert("createdAt".into(), json!(iso_now()));
    doc.insert("updatedAt".into(), json!(iso_now()));

    let mut docs = match store::read_collection(&app.db_dir(), db::DB_NAME, STUDENTS) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    docs.push(Value::Object(doc.clone()));
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, STUDENTS, &docs) {
        return action_err(e);
    }
    action_ok(Value::Object(doc))
}

pub fn update_school_student(
    app: &AppState,
    session: &SessionState,
    student_id: &str,
    input: Value,
) -> ActionResult<()> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let patch_obj = match input.as_object() {
        Some(v) => v,
        None => return action_err("Invalid student patch"),
    };
    let mut docs = match store::read_collection(&app.db_dir(), db::DB_NAME, STUDENTS) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let idx = match find_doc_index(&docs, student_id) {
        Some(v) => v,
        None => return action_err("Student not found"),
    };
    if !org_id_matches(&docs[idx], &org_id) {
        return action_err("Student not found");
    }

    let class_id = patch_obj.get("classId").and_then(value_as_id);
    let mut patch = patch_obj.clone();
    if let Some(cid) = class_id {
        if let Some(class_doc) = find_org_doc_by_id(app, CLASSES, &org_id, &cid) {
            if let Some(name) = class_doc.get("name").and_then(|v| v.as_str()) {
                patch.insert("className".into(), json!(name));
            }
            let level = resolve_education_level(
                class_doc.get("educationLevel").and_then(|v| v.as_str()),
                DEFAULT_LEVEL,
            );
            patch.insert("educationLevel".into(), json!(level));
        }
    }
    if let Some(v) = patch.get("studentNumber").and_then(|v| v.as_str()) {
        patch.insert("studentNumber".into(), json!(v.trim().to_uppercase()));
    }
    trim_patch_field(&mut patch, "firstName");
    trim_patch_field(&mut patch, "lastName");
    trim_patch_field(&mut patch, "className");
    trim_patch_field(&mut patch, "guardianName");
    trim_patch_field(&mut patch, "guardianPhone");
    trim_patch_field(&mut patch, "guardianEmail");
    trim_patch_field(&mut patch, "notes");
    patch.insert("updatedAt".into(), json!(iso_now()));

    if let Some(obj) = docs[idx].as_object_mut() {
        for (k, v) in patch {
            if k == "_id" || k == "orgId" || k == "createdAt" {
                continue;
            }
            obj.insert(k, v);
        }
    }
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, STUDENTS, &docs) {
        return action_err(e);
    }
    action_ok(())
}

pub fn delete_school_student(
    app: &AppState,
    session: &SessionState,
    student_id: &str,
) -> ActionResult<()> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut docs = match store::read_collection(&app.db_dir(), db::DB_NAME, STUDENTS) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let before = docs.len();
    docs.retain(|d| doc_id(d).as_deref() != Some(student_id) || !org_id_matches(d, &org_id));
    if docs.len() == before {
        return action_err("Student not found");
    }
    if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, STUDENTS, &docs) {
        return action_err(e);
    }
    action_ok(())
}

pub fn build_school_fee_snapshot(
    app: &AppState,
    org_id: &str,
    student_id: &str,
    additional_payment: f64,
    exclude_tx_id: Option<&str>,
) -> Result<Option<Value>, String> {
    let student = match find_org_doc_by_id(app, STUDENTS, org_id, student_id) {
        Some(v) => v,
        None => return Ok(None),
    };

    let mut fees_per_term = 0.0_f64;
    let mut class_name = student
        .get("className")
        .and_then(|v| v.as_str())
        .map(str::to_string);
    if let Some(class_id) = student.get("classId").and_then(value_as_id) {
        if let Some(class_doc) = find_org_doc_by_id(app, CLASSES, org_id, &class_id) {
            fees_per_term = class_doc
                .get("feesPerTerm")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            class_name = class_doc
                .get("name")
                .and_then(|v| v.as_str())
                .map(str::to_string)
                .or(class_name);
        }
    }

    let txs = read_org_docs(app, CASHIER_TRANSACTIONS, org_id)?
        .into_iter()
        .filter(|tx| tx.get("isSchoolPayment").and_then(|v| v.as_bool()) == Some(true))
        .collect::<Vec<_>>();
    let student_name = format!(
        "{} {}",
        student.get("firstName").and_then(|v| v.as_str()).unwrap_or(""),
        student.get("lastName").and_then(|v| v.as_str()).unwrap_or("")
    )
    .trim()
    .to_string();

    let balance = compute_term_fee_balance(
        fees_per_term,
        &txs,
        student_id,
        None,
        additional_payment,
        exclude_tx_id,
        if student_name.is_empty() {
            None
        } else {
            Some(student_name)
        },
        student
            .get("studentNumber")
            .and_then(|v| v.as_str())
            .map(str::to_string),
        class_name,
    );
    let balance_value = serde_json::to_value(&balance).map_err(|e| e.to_string())?;
    Ok(Some(json!({
        "schoolTermId": balance.term_id,
        "schoolTermLabel": balance.term_label,
        "termFeesTotal": balance.fees_per_term,
        "termFeesPaid": balance.paid_this_term,
        "termFeesRemaining": balance.remaining_balance,
        "balance": balance_value
    })))
}

pub fn get_student_term_fee_balance(
    app: &AppState,
    session: &SessionState,
    student_id: &str,
    additional_payment: f64,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    match build_school_fee_snapshot(app, &org_id, student_id, additional_payment, None) {
        Ok(Some(v)) => action_ok(v.get("balance").cloned().unwrap_or(json!({}))),
        Ok(None) => action_err("Student not found"),
        Err(e) => action_err(e),
    }
}

pub fn get_school_receipt_fee_info(
    app: &AppState,
    session: &SessionState,
    student_id: &str,
) -> ActionResult<Option<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let snap = match build_school_fee_snapshot(app, &org_id, student_id, 0.0, None) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let Some(snapshot) = snap else {
        return action_ok(None);
    };
    let total = snapshot
        .get("termFeesTotal")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    if total <= 0.0 {
        return action_ok(None);
    }
    action_ok(Some(json!({
        "schoolTermId": snapshot.get("schoolTermId").cloned().unwrap_or(Value::Null),
        "schoolTermLabel": snapshot.get("schoolTermLabel").cloned().unwrap_or(Value::Null),
        "termFeesTotal": snapshot.get("termFeesTotal").cloned().unwrap_or(Value::Null),
        "termFeesPaid": snapshot.get("termFeesPaid").cloned().unwrap_or(Value::Null),
        "termFeesRemaining": snapshot.get("termFeesRemaining").cloned().unwrap_or(Value::Null),
    })))
}

pub fn get_school_students_with_balances(
    app: &AppState,
    session: &SessionState,
    org_id_override: Option<&str>,
) -> ActionResult<Vec<Value>> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let org_id = org_id_override.unwrap_or(&session_org_id);

    let mut students = match read_org_docs(app, STUDENTS, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    students.sort_by(|a, b| {
        let al = a.get("lastName").and_then(|v| v.as_str()).unwrap_or("");
        let bl = b.get("lastName").and_then(|v| v.as_str()).unwrap_or("");
        al.cmp(bl).then_with(|| {
            let af = a.get("firstName").and_then(|v| v.as_str()).unwrap_or("");
            let bf = b.get("firstName").and_then(|v| v.as_str()).unwrap_or("");
            af.cmp(bf)
        })
    });
    let classes = match read_org_docs(app, CLASSES, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let txs = match read_org_docs(app, CASHIER_TRANSACTIONS, org_id) {
        Ok(v) => v
            .into_iter()
            .filter(|tx| tx.get("isSchoolPayment").and_then(|v| v.as_bool()) == Some(true))
            .collect::<Vec<_>>(),
        Err(e) => return action_err(e),
    };

    let class_map: HashMap<String, Value> = classes
        .into_iter()
        .filter_map(|c| doc_id(&c).map(|id| (id, c)))
        .collect();

    let mut result = Vec::with_capacity(students.len());
    for mut s in students {
        let class_doc = s
            .get("classId")
            .and_then(value_as_id)
            .and_then(|cid| class_map.get(&cid).cloned());
        let level = resolve_education_level(
            s.get("educationLevel")
                .and_then(|v| v.as_str())
                .or_else(|| class_doc.as_ref().and_then(|c| c.get("educationLevel").and_then(|v| v.as_str()))),
            DEFAULT_LEVEL,
        );
        let student_id = doc_id(&s).unwrap_or_default();
        let student_name = format!(
            "{} {}",
            s.get("firstName").and_then(|v| v.as_str()).unwrap_or(""),
            s.get("lastName").and_then(|v| v.as_str()).unwrap_or("")
        )
        .trim()
        .to_string();
        let fee_balance = compute_term_fee_balance(
            class_doc
                .as_ref()
                .and_then(|c| c.get("feesPerTerm"))
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0),
            &txs,
            &student_id,
            None,
            0.0,
            None,
            if student_name.is_empty() {
                None
            } else {
                Some(student_name)
            },
            s.get("studentNumber")
                .and_then(|v| v.as_str())
                .map(str::to_string),
            class_doc
                .as_ref()
                .and_then(|c| c.get("name"))
                .and_then(|v| v.as_str())
                .map(str::to_string)
                .or_else(|| s.get("className").and_then(|v| v.as_str()).map(str::to_string)),
        );
        if let Some(obj) = s.as_object_mut() {
            obj.insert("educationLevel".into(), json!(level));
            let fee_value = serde_json::to_value(fee_balance).unwrap_or_else(|_| json!({}));
            obj.insert("feeBalance".into(), fee_value);
        }
        result.push(s);
    }
    action_ok(result)
}

pub fn create_school_classes_from_templates(
    app: &AppState,
    session: &SessionState,
    education_level: &str,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let level = resolve_education_level(Some(education_level), DEFAULT_LEVEL);
    let templates = templates_for_level(&level);

    let mut docs = match store::read_collection(&app.db_dir(), db::DB_NAME, CLASSES) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let existing_names: HashSet<String> = docs
        .iter()
        .filter(|d| org_id_matches(d, &org_id))
        .filter(|d| d.get("educationLevel").and_then(|v| v.as_str()).unwrap_or(DEFAULT_LEVEL) == level)
        .filter_map(|d| d.get("name").and_then(|v| v.as_str()).map(|n| n.to_lowercase()))
        .collect();

    let mut created = 0usize;
    let now = iso_now();
    for (name, grade_level, fees_per_term) in templates {
        if existing_names.contains(&name.to_lowercase()) {
            continue;
        }
        docs.push(json!({
            "_id": make_object_id(),
            "orgId": org_id,
            "educationLevel": level,
            "name": name,
            "gradeLevel": grade_level,
            "feesPerTerm": fees_per_term,
            "createdAt": now,
            "updatedAt": now,
        }));
        created += 1;
    }
    if created > 0 {
        if let Err(e) = store::write_collection(&app.db_dir(), db::DB_NAME, CLASSES, &docs) {
            return action_err(e);
        }
    }
    action_ok(json!({ "created": created }))
}

pub fn get_school_dashboard_stats(
    app: &AppState,
    session: &SessionState,
    org_id_override: Option<&str>,
) -> ActionResult<Value> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let org_id = org_id_override.unwrap_or(&session_org_id);

    let students = match read_org_docs(app, STUDENTS, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let classes = match read_org_docs(app, CLASSES, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let payments = match read_org_docs(app, CASHIER_TRANSACTIONS, org_id) {
        Ok(v) => v
            .into_iter()
            .filter(|tx| tx.get("isSchoolPayment").and_then(|v| v.as_bool()) == Some(true))
            .collect::<Vec<_>>(),
        Err(e) => return action_err(e),
    };
    let settings = match load_school_settings(app, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let class_map: HashMap<String, Value> = classes
        .iter()
        .filter_map(|c| doc_id(c).map(|id| (id, c.clone())))
        .collect();
    let enabled_levels = normalize_levels(settings.get("enabledLevels"));
    let by_level = enabled_levels
        .iter()
        .map(|level| {
            let students_count = students
                .iter()
                .filter(|s| s.get("status").and_then(|v| v.as_str()).unwrap_or("active") == "active")
                .filter(|s| student_level(s, &class_map) == *level)
                .count();
            let classes_count = classes
                .iter()
                .filter(|c| resolve_education_level(c.get("educationLevel").and_then(|v| v.as_str()), DEFAULT_LEVEL) == *level)
                .count();
            json!({
                "level": level,
                "students": students_count,
                "classes": classes_count
            })
        })
        .collect::<Vec<_>>();

    let month_start_ms = month_start_ms(now_ms());
    let fees_this_month = payments
        .iter()
        .filter(|p| {
            p.get("createdAt")
                .and_then(|v| v.as_str())
                .and_then(parse_iso_ms)
                .map(|ms| ms >= month_start_ms)
                .unwrap_or(false)
        })
        .fold(0.0_f64, |acc, p| acc + p.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0));

    action_ok(json!({
        "totalStudents": students.len(),
        "activeStudents": students.iter().filter(|s| s.get("status").and_then(|v| v.as_str()).unwrap_or("active") == "active").count(),
        "classCount": classes.len(),
        "schoolPayments": payments.len(),
        "feesThisMonth": fees_this_month,
        "enabledLevels": enabled_levels,
        "institutionName": settings.get("institutionName").cloned().unwrap_or(Value::Null),
        "byLevel": by_level
    }))
}

fn normalize_class_education_level(mut class_doc: Value) -> Value {
    if let Some(obj) = class_doc.as_object_mut() {
        let level = resolve_education_level(obj.get("educationLevel").and_then(|v| v.as_str()), DEFAULT_LEVEL);
        obj.insert("educationLevel".into(), json!(level));
    }
    class_doc
}

fn load_school_settings(app: &AppState, org_id: &str) -> Result<Value, String> {
    let settings_docs = read_org_docs(app, SETTINGS, org_id)?;
    let mut data = if let Some(doc) = settings_docs.into_iter().next() {
        doc
    } else {
        json!({
            "orgId": org_id,
            "enabledLevels": EDUCATION_LEVELS,
            "defaultLevel": DEFAULT_LEVEL,
            "updatedAt": iso_now(),
        })
    };

    let enabled_levels = normalize_levels(data.get("enabledLevels"));
    let default_level = resolve_education_level(
        data.get("defaultLevel").and_then(|v| v.as_str()),
        DEFAULT_LEVEL,
    );
    if let Some(obj) = data.as_object_mut() {
        obj.insert("enabledLevels".into(), json!(enabled_levels));
        obj.insert("defaultLevel".into(), json!(default_level));
        obj.insert("orgId".into(), json!(org_id));
        if obj.get("updatedAt").is_none() {
            obj.insert("updatedAt".into(), json!(iso_now()));
        }
    }
    Ok(data)
}

fn resolve_education_level(value: Option<&str>, fallback: &str) -> String {
    if let Some(v) = value {
        if EDUCATION_LEVELS.contains(&v) {
            return v.to_string();
        }
    }
    if EDUCATION_LEVELS.contains(&fallback) {
        return fallback.to_string();
    }
    DEFAULT_LEVEL.to_string()
}

fn normalize_levels(levels: Option<&Value>) -> Vec<String> {
    let mut out = Vec::<String>::new();
    if let Some(arr) = levels.and_then(|v| v.as_array()) {
        for level in arr {
            if let Some(s) = level.as_str() {
                if EDUCATION_LEVELS.contains(&s) && !out.iter().any(|x| x == s) {
                    out.push(s.to_string());
                }
            }
        }
    }
    if out.is_empty() {
        EDUCATION_LEVELS.iter().map(|s| s.to_string()).collect()
    } else {
        out
    }
}

fn find_org_doc_by_id(app: &AppState, collection: &str, org_id: &str, id: &str) -> Option<Value> {
    read_org_docs(app, collection, org_id)
        .ok()
        .and_then(|rows| rows.into_iter().find(|d| doc_id(d).as_deref() == Some(id)))
}

fn next_student_number(app: &AppState, org_id: &str) -> Result<String, String> {
    let existing = read_org_docs(app, STUDENTS, org_id)?
        .into_iter()
        .filter_map(|s| {
            s.get("studentNumber")
                .and_then(|v| v.as_str())
                .map(|n| n.to_uppercase())
        })
        .collect::<HashSet<_>>();
    generate_student_number(&existing)
}

fn generate_student_number(existing: &HashSet<String>) -> Result<String, String> {
    let year = year_suffix(now_ms());
    let letters = LETTERS.as_bytes();
    for attempt in 0..500_i64 {
        let seed = now_ms()
            .wrapping_add(attempt * 7919)
            .wrapping_mul(1103515245)
            .wrapping_add(12345);
        let digits = 1000 + (seed.unsigned_abs() % 9000) as i64;
        let letter = letters[(seed.unsigned_abs() % letters.len() as u64) as usize] as char;
        let candidate = format!("ST{year}{digits:04}{letter}");
        if !existing.contains(&candidate) {
            return Ok(candidate);
        }
    }
    Err("Could not generate a unique student number. Try again.".to_string())
}

fn year_suffix(ms: i64) -> String {
    let year = ymd_from_ms(ms).0;
    format!("{:02}", year % 100)
}

fn ymd_from_ms(ms: i64) -> (i64, i64, i64) {
    let secs = ms.div_euclid(1000);
    let days = secs.div_euclid(86400);
    civil_from_days(days)
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let era = if days >= 0 { days } else { days - 146096 } / 146097;
    let doe = days - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if month <= 2 { y + 1 } else { y };
    (year, month, day)
}

fn month_start_ms(ms: i64) -> i64 {
    let (year, month, _) = ymd_from_ms(ms);
    let days = days_from_civil(year, month, 1);
    days * 86_400_000
}

fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let y = if month <= 2 { year - 1 } else { year };
    let era = if year >= 0 { y / 400 } else { (y - 399) / 400 };
    let yoe = y - era * 400;
    let doy = (153 * (if month > 2 { month - 3 } else { month + 9 }) + 2) / 5 + day - 1;
    yoe * 365 + yoe / 4 - yoe / 100 + doy + era * 146097
}

fn student_level(student: &Value, class_map: &HashMap<String, Value>) -> String {
    let class_level = student
        .get("classId")
        .and_then(value_as_id)
        .and_then(|id| class_map.get(&id).and_then(|c| c.get("educationLevel")).and_then(|v| v.as_str()));
    resolve_education_level(
        student
            .get("educationLevel")
            .and_then(|v| v.as_str())
            .or(class_level),
        DEFAULT_LEVEL,
    )
}

fn copy_if_present(dst: &mut Map<String, Value>, src: &Map<String, Value>, key: &str) {
    if let Some(v) = src.get(key) {
        dst.insert(key.to_string(), v.clone());
    }
}

fn copy_trimmed_if_present(dst: &mut Map<String, Value>, src: &Map<String, Value>, key: &str) {
    if let Some(val) = src
        .get(key)
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        dst.insert(key.to_string(), json!(val));
    }
}

fn trim_patch_field(patch: &mut Map<String, Value>, key: &str) {
    if let Some(v) = patch.get(key).and_then(|v| v.as_str()) {
        patch.insert(key.to_string(), json!(v.trim()));
    }
}

fn templates_for_level(level: &str) -> Vec<(&'static str, &'static str, f64)> {
    match level {
        "high_school" => vec![
            ("Form 1A", "Form 1", 550.0),
            ("Form 2A", "Form 2", 580.0),
            ("Form 3 Sciences", "Form 3", 620.0),
            ("Form 4 Sciences", "Form 4", 650.0),
            ("Lower 6 Arts", "Lower 6", 720.0),
            ("Upper 6 Sciences", "Upper 6", 750.0),
        ],
        "tertiary" => vec![
            ("Diploma IT — Year 1", "Year 1", 1200.0),
            ("Diploma Business — Year 1", "Year 1", 1100.0),
            ("BSc Computer Science — Y1", "Year 1", 1800.0),
            ("BSc Accounting — Y2", "Year 2", 1950.0),
            ("MBA — Semester 1", "Semester 1", 2500.0),
        ],
        _ => vec![
            ("Grade 1 Blue", "Grade 1", 350.0),
            ("Grade 2 Blue", "Grade 2", 380.0),
            ("Grade 3 Blue", "Grade 3", 400.0),
            ("Grade 4 Blue", "Grade 4", 420.0),
            ("Grade 5 Blue", "Grade 5", 450.0),
            ("Grade 6 Blue", "Grade 6", 480.0),
            ("Grade 7 Blue", "Grade 7", 500.0),
        ],
    }
}
