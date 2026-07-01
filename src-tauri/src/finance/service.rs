use serde_json::{json, Map, Value};

use crate::admin::access::{doc_id, org_id_matches, session_org, value_as_id};
use crate::admin::service::ActionResult;
use crate::auth::models::{make_object_id, PublicProfile};
use crate::auth::session::SessionState;
use crate::db::{self, store};
use crate::state::AppState;
use crate::store_util::{
    action_err, action_ok, delete_doc_by_id, doc_date_ms, in_date_range, insert_org_doc, iso_now,
    now_ms, parse_iso_ms, read_org_docs, sum_field, update_doc_by_id,
};

const INVOICES: &str = "invoices";
const PAYMENTS: &str = "payments";
const EXPENSES: &str = "expenses";
const FINANCE_SETTINGS: &str = "finance_settings";
const CASHIER_TRANSACTIONS: &str = "cashier_transactions";
const BUDGETS: &str = "budgets";
const POS_ORDERS: &str = "pos_orders";
const PAYROLL_RECORDS: &str = "payroll_records";

const DEFAULT_FINANCE_SETTINGS_JSON: &str = r#"{
  "defaultCurrency": "USD",
  "accountCategories": [
    { "id": "cash", "name": "Cash", "slug": "cash", "enabled": true },
    { "id": "bank", "name": "Bank", "slug": "bank", "enabled": true },
    { "id": "other", "name": "Other", "slug": "other", "enabled": true }
  ],
  "paymentTypes": [
    { "id": "tuition-fees", "name": "Tuition Fees", "enabled": true },
    { "id": "transport", "name": "Transport", "enabled": true },
    { "id": "uniform-fee", "name": "Uniform Fee", "enabled": true },
    { "id": "general-sale", "name": "General Sale", "enabled": true },
    { "id": "supplies", "name": "Supplies", "enabled": true },
    { "id": "services", "name": "Services", "enabled": true },
    { "id": "misc", "name": "Miscellaneous", "enabled": true }
  ]
}"#;

pub fn create_invoice(app: &AppState, session: &SessionState, data: Value) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut doc = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid invoice payload"),
    };
    doc.remove("_id");
    doc.remove("createdAt");
    doc.insert("orgId".into(), json!(org_id));
    doc.insert("createdAt".into(), json!(iso_now()));
    if !doc.contains_key("invoiceId") {
        doc.insert("invoiceId".into(), json!(make_object_id()));
    }
    match insert_org_doc(app, INVOICES, &org_id, doc) {
        Ok(row) => {
            maybe_post_invoice_gl(app, &org_id, &row);
            action_ok(row)
        }
        Err(e) => action_err(e),
    }
}

pub fn get_invoice(app: &AppState, session: &SessionState, invoice_id: &str) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let docs = match read_org_docs(app, INVOICES, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let row = docs
        .into_iter()
        .find(|d| id_matches(d, invoice_id, &["invoiceId"]))
        .unwrap_or(Value::Null);
    action_ok(row)
}

pub fn get_invoices_by_org(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
    start_date: Option<&str>,
    end_date: Option<&str>,
) -> ActionResult<Vec<Value>> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target_org = match resolve_target_org(&session_org_id, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let start_ms = start_date.and_then(parse_iso_ms);
    let end_ms = end_date.and_then(parse_iso_ms).map(end_of_day_ms);
    let mut docs = match read_org_docs(app, INVOICES, &target_org) {
        Ok(v) => v
            .into_iter()
            .filter(|d| in_date_range(d, "createdAt", start_ms, end_ms))
            .collect::<Vec<_>>(),
        Err(e) => return action_err(e),
    };
    docs.sort_by(sort_created_desc);
    action_ok(docs)
}

pub fn update_invoice(
    app: &AppState,
    session: &SessionState,
    invoice_id: &str,
    data: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let docs = match read_org_docs(app, INVOICES, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let idx = match docs
        .iter()
        .position(|d| id_matches(d, invoice_id, &["invoiceId"]))
    {
        Some(v) => v,
        None => return action_err("Invoice not found"),
    };
    let real_id = match doc_id(&docs[idx]) {
        Some(v) => v,
        None => return action_err("Invoice not found"),
    };
    let mut patch = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid invoice patch"),
    };
    patch.remove("_id");
    patch.remove("orgId");
    patch.remove("createdAt");
    patch.insert("updatedAt".into(), json!(iso_now()));
    match update_doc_by_id(app, INVOICES, &real_id, patch) {
        Ok(Some(v)) => {
            maybe_post_invoice_gl(app, &org_id, &v);
            action_ok(v)
        }
        Ok(None) => action_err("Invoice not found"),
        Err(e) => action_err(e),
    }
}

pub fn delete_invoice(app: &AppState, session: &SessionState, invoice_id: &str) -> ActionResult<bool> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let docs = match read_org_docs(app, INVOICES, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let real_id = match docs
        .iter()
        .find(|d| id_matches(d, invoice_id, &["invoiceId"]))
        .and_then(doc_id)
    {
        Some(v) => v,
        None => return action_err("Invoice not found"),
    };
    match delete_doc_by_id(app, INVOICES, &real_id) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}

pub fn create_payment(app: &AppState, session: &SessionState, data: Value) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut doc = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid payment payload"),
    };
    doc.remove("_id");
    doc.insert("orgId".into(), json!(org_id.clone()));
    doc.insert("createdAt".into(), json!(iso_now()));
    let payment = match insert_org_doc(app, PAYMENTS, &org_id, doc) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    maybe_mark_invoice_paid(app, &org_id, payment.get("invoiceId"), payment.get("status"));
    maybe_post_payment_gl(app, &org_id, &payment);
    action_ok(payment)
}

pub fn get_payments_by_invoice(
    app: &AppState,
    session: &SessionState,
    invoice_id: &str,
) -> ActionResult<Vec<Value>> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = match read_org_docs(app, PAYMENTS, &org_id) {
        Ok(v) => v
            .into_iter()
            .filter(|d| field_id_eq(d, "invoiceId", invoice_id))
            .collect::<Vec<_>>(),
        Err(e) => return action_err(e),
    };
    rows.sort_by(sort_created_desc);
    action_ok(rows)
}

pub fn get_payments_by_org(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
) -> ActionResult<Vec<Value>> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target_org = match resolve_target_org(&session_org_id, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    if let Err(e) = sync_ops_payments_for_org(app, &target_org) {
        return action_err(e);
    }
    let mut rows = match read_org_docs(app, PAYMENTS, &target_org) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    rows.sort_by(sort_created_desc);
    action_ok(rows)
}

pub fn update_payment(
    app: &AppState,
    session: &SessionState,
    payment_id: &str,
    data: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let docs = match read_org_docs(app, PAYMENTS, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let current = match docs.iter().find(|d| doc_id(d).as_deref() == Some(payment_id)) {
        Some(v) => v.clone(),
        None => return action_err("Payment not found"),
    };
    let mut patch = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid payment patch"),
    };
    patch.remove("_id");
    patch.remove("orgId");
    patch.remove("createdAt");
    patch.insert("updatedAt".into(), json!(iso_now()));
    let updated = match update_doc_by_id(app, PAYMENTS, payment_id, patch) {
        Ok(Some(v)) => v,
        Ok(None) => return action_err("Payment not found"),
        Err(e) => return action_err(e),
    };
    maybe_mark_invoice_paid(
        app,
        &org_id,
        updated.get("invoiceId").or_else(|| current.get("invoiceId")),
        updated.get("status").or_else(|| current.get("status")),
    );
    maybe_post_payment_gl(app, &org_id, &updated);
    action_ok(updated)
}

pub fn create_expense(app: &AppState, session: &SessionState, data: Value) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut doc = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid expense payload"),
    };
    doc.remove("_id");
    doc.insert("orgId".into(), json!(org_id));
    doc.insert("createdAt".into(), json!(iso_now()));
    match insert_org_doc(app, EXPENSES, &org_id, doc) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}

pub fn get_expenses_by_org(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
    start_date: Option<&str>,
    end_date: Option<&str>,
) -> ActionResult<Vec<Value>> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target_org = match resolve_target_org(&session_org_id, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    if let Err(e) = sync_payroll_expenses_for_org(app, &target_org) {
        eprintln!("[finance] payroll expense sync failed: {e}");
    }
    let start_ms = start_date.and_then(parse_iso_ms);
    let end_ms = end_date.and_then(parse_iso_ms).map(end_of_day_ms);
    let mut rows = match read_org_docs(app, EXPENSES, &target_org) {
        Ok(v) => v
            .into_iter()
            .filter(|d| expense_in_date_range(d, start_ms, end_ms))
            .collect::<Vec<_>>(),
        Err(e) => return action_err(e),
    };
    rows.sort_by(sort_date_desc);
    action_ok(rows)
}

pub fn get_expenses_by_status(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
    status: &str,
) -> ActionResult<Vec<Value>> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target_org = match resolve_target_org(&session_org_id, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows = match read_org_docs(app, EXPENSES, &target_org) {
        Ok(v) => v
            .into_iter()
            .filter(|d| d.get("status").and_then(|v| v.as_str()) == Some(status))
            .collect::<Vec<_>>(),
        Err(e) => return action_err(e),
    };
    rows.sort_by(sort_date_desc);
    action_ok(rows)
}

pub fn update_expense(
    app: &AppState,
    session: &SessionState,
    expense_id: &str,
    data: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let docs = match read_org_docs(app, EXPENSES, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    if docs.iter().all(|d| doc_id(d).as_deref() != Some(expense_id)) {
        return action_err("Expense not found");
    }
    let mut patch = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid expense patch"),
    };
    patch.remove("_id");
    patch.remove("orgId");
    patch.remove("createdAt");
    patch.insert("updatedAt".into(), json!(iso_now()));
    match update_doc_by_id(app, EXPENSES, expense_id, patch) {
        Ok(Some(v)) => {
            maybe_post_expense_gl(app, &org_id, &v);
            action_ok(v)
        }
        Ok(None) => action_err("Expense not found"),
        Err(e) => action_err(e),
    }
}

pub fn delete_expense(app: &AppState, session: &SessionState, expense_id: &str) -> ActionResult<bool> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let docs = match read_org_docs(app, EXPENSES, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    if docs.iter().all(|d| doc_id(d).as_deref() != Some(expense_id)) {
        return action_err("Expense not found");
    }
    match delete_doc_by_id(app, EXPENSES, expense_id) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}

pub fn get_finance_settings(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
) -> ActionResult<Value> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target_org = match resolve_target_org(&session_org_id, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let docs = match read_org_docs(app, FINANCE_SETTINGS, &target_org) {
        Ok(v) => v,
        Err(_) => Vec::new(),
    };
    if let Some(row) = docs.into_iter().next() {
        return action_ok(row);
    }
    let mut defaults = default_finance_settings();
    if let Some(obj) = defaults.as_object_mut() {
        obj.insert("orgId".into(), json!(target_org));
    }
    action_ok(defaults)
}

pub fn update_finance_settings(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
    settings: Value,
) -> ActionResult<bool> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target_org = match resolve_target_org(&session_org_id, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let patch_obj = match settings.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid finance settings"),
    };
    let existing = read_org_docs(app, FINANCE_SETTINGS, &target_org)
        .unwrap_or_default()
        .into_iter()
        .next();
    if let Some(row) = existing {
        let row_id = match doc_id(&row) {
            Some(v) => v,
            None => return action_err("Invalid finance settings row"),
        };
        let mut patch = patch_obj;
        patch.insert("orgId".into(), json!(target_org));
        patch.insert("updatedAt".into(), json!(iso_now()));
        match update_doc_by_id(app, FINANCE_SETTINGS, &row_id, patch) {
            Ok(Some(_)) => action_ok(true),
            Ok(None) => action_err("Failed to update finance settings"),
            Err(e) => action_err(e),
        }
    } else {
        let mut doc = default_finance_settings()
            .as_object()
            .cloned()
            .unwrap_or_default();
        for (k, v) in patch_obj {
            doc.insert(k, v);
        }
        doc.insert("orgId".into(), json!(target_org));
        doc.insert("createdAt".into(), json!(iso_now()));
        doc.insert("updatedAt".into(), json!(iso_now()));
        match insert_org_doc(app, FINANCE_SETTINGS, &target_org, doc) {
            Ok(_) => action_ok(true),
            Err(e) => action_err(e),
        }
    }
}

pub fn create_cashier_transaction(
    app: &AppState,
    session: &SessionState,
    data: Value,
) -> ActionResult<Value> {
    let (user, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut doc = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid transaction payload"),
    };
    doc.remove("_id");
    doc.insert("orgId".into(), json!(org_id.clone()));
    doc.insert("cashierId".into(), json!(user.id));
    doc.insert("cashierName".into(), json!(PublicProfile::from_user(&user).display_name));
    doc.insert("createdAt".into(), json!(iso_now()));

    let is_school_payment = doc
        .get("isSchoolPayment")
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
        || crate::school::school_term::is_school_payment_type(
            doc.get("paymentTypeId").and_then(|v| v.as_str()),
            doc.get("paymentType").and_then(|v| v.as_str()),
        );
    if is_school_payment {
        doc.insert("isSchoolPayment".into(), json!(true));
    }
    let student_id = doc
        .get("studentId")
        .and_then(|v| v.as_str())
        .map(str::to_string);

    if is_school_payment {
        if let Some(student_id) = student_id {
            let payment_amount = doc
                .get("amount")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0)
                .abs();
            let additional = if crate::school::school_term::school_payment_counts_for_term_balance(&Value::Object(doc.clone()))
            {
                crate::school::school_term::school_payment_delta(
                    doc.get("type").and_then(|v| v.as_str()),
                    Some(payment_amount),
                )
                .max(0.0)
            } else {
                0.0
            };
            if let Ok(Some(snapshot)) =
                crate::school::service::build_school_fee_snapshot(app, &org_id, &student_id, additional, None)
            {
                if let Some(term_id) = snapshot.get("schoolTermId") {
                    doc.insert("schoolTermId".into(), term_id.clone());
                }
                if let Some(term_label) = snapshot.get("schoolTermLabel") {
                    doc.insert("schoolTermLabel".into(), term_label.clone());
                }
                if let Some(total) = snapshot.get("termFeesTotal") {
                    doc.insert("termFeesTotal".into(), total.clone());
                }
                if let Some(paid) = snapshot.get("termFeesPaid") {
                    doc.insert("termFeesPaid".into(), paid.clone());
                }
                if let Some(remaining) = snapshot.get("termFeesRemaining") {
                    doc.insert("termFeesRemaining".into(), remaining.clone());
                }
            }
        }
    }

    match insert_org_doc(app, CASHIER_TRANSACTIONS, &org_id, doc) {
        Ok(v) => {
            maybe_post_cashier_gl(app, &org_id, &v);
            if let Err(e) = record_cashier_payment(app, &org_id, &v) {
                eprintln!("[finance] cashier payment sync failed: {e}");
            }
            action_ok(v)
        }
        Err(e) => action_err(e),
    }
}

pub fn get_cashier_transactions(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
) -> ActionResult<Vec<Value>> {
    get_cashier_transactions_filtered(app, session, org_id, None, None, None, None)
}

pub fn get_cashier_transactions_filtered(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
    cashier_id: Option<&str>,
    start_date: Option<&str>,
    end_date: Option<&str>,
    limit: Option<usize>,
) -> ActionResult<Vec<Value>> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target_org = match resolve_target_org(&session_org_id, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let start_ms = start_date.and_then(parse_filter_start_ms);
    let end_ms = end_date.and_then(parse_filter_end_ms);
    let all_rows = match store::read_collection(&app.db_dir(), db::DB_NAME, CASHIER_TRANSACTIONS) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut rows: Vec<Value> = all_rows
        .iter()
        .filter(|d| org_id_matches(d, &target_org))
        .cloned()
        .collect();
    if rows.is_empty() && !all_rows.is_empty() {
        // Legacy rows may lack orgId — desktop register still needs to show them
        rows = all_rows
            .iter()
            .filter(|d| {
                d.get("orgId").is_none()
                    || d.get("orgId")
                        .and_then(|v| v.as_str())
                        .map(|s| s.is_empty())
                        .unwrap_or(false)
            })
            .cloned()
            .collect();
        if rows.is_empty() {
            rows = all_rows;
        }
    }
    let mut rows = rows
        .into_iter()
        .filter(|d| {
            if let Some(cid) = cashier_id {
                match d.get("cashierId").and_then(value_as_id) {
                    Some(stored) if stored == cid => {}
                    None => {}
                    Some(_) => return false,
                }
            }
            in_date_range(d, "createdAt", start_ms, end_ms)
        })
        .collect::<Vec<_>>();
    rows.sort_by(sort_created_desc);
    if let Some(v) = limit {
        rows.truncate(v);
    }
    action_ok(rows)
}

pub fn get_daily_cash_summary(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
    date: Option<&str>,
) -> ActionResult<Value> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target_org = match resolve_target_org(&session_org_id, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let (start_ms, end_ms, day_iso) = day_range_from_input(date);
    let rows = match read_org_docs(app, CASHIER_TRANSACTIONS, &target_org) {
        Ok(v) => v
            .into_iter()
            .filter(|d| in_date_range(d, "createdAt", Some(start_ms), Some(end_ms)))
            .collect::<Vec<_>>(),
        Err(e) => return action_err(e),
    };

    let sales = sum_for_type(&rows, "sale");
    let refunds = sum_for_type(&rows, "refund");
    let deposits = sum_for_type(&rows, "deposit");
    let withdrawals = sum_for_type(&rows, "withdrawal");
    let opening_balance = 0.0f64;
    let closing_balance = opening_balance + sales - refunds + deposits - withdrawals;
    let summary = json!({
        "date": day_iso,
        "openingBalance": opening_balance,
        "sales": sales,
        "refunds": refunds,
        "deposits": deposits,
        "withdrawals": withdrawals,
        "closingBalance": closing_balance,
        "transactions": rows
    });
    action_ok(summary)
}

pub fn create_budget(app: &AppState, session: &SessionState, data: Value) -> ActionResult<Value> {
    let (user, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let mut doc = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid budget payload"),
    };
    doc.remove("_id");
    doc.insert("orgId".into(), json!(org_id));
    doc.entry("spent").or_insert(json!(0.0));
    doc.entry("status").or_insert(json!("draft"));
    doc.entry("createdBy").or_insert(json!(user.id));
    doc.insert("createdAt".into(), json!(iso_now()));
    doc.insert("updatedAt".into(), json!(iso_now()));
    match insert_org_doc(app, BUDGETS, &org_id, doc) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}

pub fn get_budgets_by_org(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
) -> ActionResult<Vec<Value>> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target_org = match resolve_target_org(&session_org_id, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let expenses = match read_org_docs(app, EXPENSES, &target_org) {
        Ok(v) => v,
        Err(_) => Vec::new(),
    };
    let mut budgets = match read_org_docs(app, BUDGETS, &target_org) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    for budget in &mut budgets {
        let spent = compute_budget_spent(&expenses, budget);
        if let Some(obj) = budget.as_object_mut() {
            obj.insert("spent".into(), json!(spent));
        }
    }
    budgets.sort_by(sort_created_desc);
    action_ok(budgets)
}

pub fn update_budget(
    app: &AppState,
    session: &SessionState,
    budget_id: &str,
    data: Value,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let docs = match read_org_docs(app, BUDGETS, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    if docs.iter().all(|d| doc_id(d).as_deref() != Some(budget_id)) {
        return action_err("Budget not found");
    }
    let mut patch = match data.as_object() {
        Some(v) => v.clone(),
        None => return action_err("Invalid budget patch"),
    };
    patch.remove("_id");
    patch.remove("createdAt");
    patch.remove("orgId");
    patch.insert("updatedAt".into(), json!(iso_now()));
    match update_doc_by_id(app, BUDGETS, budget_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_err("Budget not found"),
        Err(e) => action_err(e),
    }
}

pub fn delete_budget(app: &AppState, session: &SessionState, budget_id: &str) -> ActionResult<bool> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let docs = match read_org_docs(app, BUDGETS, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    if docs.iter().all(|d| doc_id(d).as_deref() != Some(budget_id)) {
        return action_err("Budget not found");
    }
    match delete_doc_by_id(app, BUDGETS, budget_id) {
        Ok(v) => action_ok(v),
        Err(e) => action_err(e),
    }
}

pub fn update_budget_status(
    app: &AppState,
    session: &SessionState,
    budget_id: &str,
    status: &str,
    approved_by: Option<&str>,
) -> ActionResult<Value> {
    let (user, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let docs = match read_org_docs(app, BUDGETS, &org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    if docs.iter().all(|d| doc_id(d).as_deref() != Some(budget_id)) {
        return action_err("Budget not found");
    }
    let mut patch = Map::new();
    patch.insert("status".into(), json!(status));
    patch.insert("updatedAt".into(), json!(iso_now()));
    if status == "approved" {
        patch.insert(
            "approvedBy".into(),
            json!(approved_by.unwrap_or(user.id.as_str())),
        );
        patch.insert("approvedAt".into(), json!(iso_now()));
    }
    match update_doc_by_id(app, BUDGETS, budget_id, patch) {
        Ok(Some(v)) => action_ok(v),
        Ok(None) => action_err("Budget not found"),
        Err(e) => action_err(e),
    }
}

pub fn get_budget_variance(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
) -> ActionResult<Vec<Value>> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target_org = match resolve_target_org(&session_org_id, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let expenses = match read_org_docs(app, EXPENSES, &target_org) {
        Ok(v) => v,
        Err(_) => Vec::new(),
    };
    let budgets = match read_org_docs(app, BUDGETS, &target_org) {
        Ok(v) => v
            .into_iter()
            .filter(|b| b.get("status").and_then(|v| v.as_str()) == Some("approved"))
            .collect::<Vec<_>>(),
        Err(e) => return action_err(e),
    };
    let rows = budgets
        .into_iter()
        .map(|mut b| {
            let spent = compute_budget_spent(&expenses, &b);
            let amount = b.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let variance = amount - spent;
            let pct = if amount > 0.0 {
                (variance / amount) * 100.0
            } else {
                0.0
            };
            if let Some(obj) = b.as_object_mut() {
                obj.insert("spent".into(), json!(spent));
                obj.insert("variance".into(), json!(variance));
                obj.insert("variancePercentage".into(), json!(pct));
            }
            b
        })
        .collect::<Vec<_>>();
    action_ok(rows)
}

pub fn get_budget_analytics(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
    period: Option<&str>,
) -> ActionResult<Value> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target_org = match resolve_target_org(&session_org_id, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let expenses = match read_org_docs(app, EXPENSES, &target_org) {
        Ok(v) => v,
        Err(_) => Vec::new(),
    };
    let budgets = match read_org_docs(app, BUDGETS, &target_org) {
        Ok(v) => v
            .into_iter()
            .filter(|b| b.get("status").and_then(|v| v.as_str()) == Some("approved"))
            .filter(|b| {
                if let Some(p) = period {
                    b.get("period").and_then(|v| v.as_str()) == Some(p)
                } else {
                    true
                }
            })
            .collect::<Vec<_>>(),
        Err(e) => return action_err(e),
    };

    let mut total_budgeted = 0.0f64;
    let mut total_spent = 0.0f64;
    let mut category_map: std::collections::BTreeMap<String, (f64, f64)> =
        std::collections::BTreeMap::new();
    for budget in &budgets {
        let amount = budget.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let spent = compute_budget_spent(&expenses, budget);
        total_budgeted += amount;
        total_spent += spent;
        let category = budget
            .get("category")
            .and_then(|v| v.as_str())
            .unwrap_or("uncategorized")
            .to_string();
        let entry = category_map.entry(category).or_insert((0.0, 0.0));
        entry.0 += amount;
        entry.1 += spent;
    }
    let mut breakdown = Map::new();
    for (category, (budgeted, spent)) in category_map {
        breakdown.insert(category, json!({ "budgeted": budgeted, "spent": spent }));
    }
    action_ok(json!({
        "totalBudgeted": total_budgeted,
        "totalSpent": total_spent,
        "variance": total_budgeted - total_spent,
        "utilizationRate": if total_budgeted > 0.0 { (total_spent / total_budgeted) * 100.0 } else { 0.0 },
        "categoryBreakdown": breakdown,
        "budgetsCount": budgets.len()
    }))
}

pub fn get_financial_summary(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
    start_date: Option<&str>,
    end_date: Option<&str>,
) -> ActionResult<Value> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target_org = match resolve_target_org(&session_org_id, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };

    let (range_start, range_end) = if let (Some(s), Some(e)) = (start_date, end_date) {
        (parse_iso_ms(s).unwrap_or(0), end_of_day_ms(parse_iso_ms(e).unwrap_or(now_ms())))
    } else {
        current_month_range_ms(now_ms())
    };

    if let Err(e) = sync_payroll_expenses_for_org(app, &target_org) {
        eprintln!("[finance] payroll expense sync failed: {e}");
    }

    let invoices = read_org_docs(app, INVOICES, &target_org).unwrap_or_default();
    let expenses = read_org_docs(app, EXPENSES, &target_org).unwrap_or_default();
    let payments = read_org_docs(app, PAYMENTS, &target_org).unwrap_or_default();
    let pos_orders = read_org_docs(app, POS_ORDERS, &target_org).unwrap_or_default();
    let cashier_txs = read_org_docs(app, CASHIER_TRANSACTIONS, &target_org).unwrap_or_default();

    let invoice_revenue = invoices
        .iter()
        .filter(|i| i.get("status").and_then(|v| v.as_str()) == Some("paid"))
        .filter(|i| in_date_range(i, "createdAt", Some(range_start), Some(range_end)))
        .filter_map(|i| i.get("total").and_then(|v| v.as_f64()))
        .sum::<f64>();

    let pos_in_range: Vec<&Value> = pos_orders
        .iter()
        .filter(|o| pos_completed_in_range(o, range_start, range_end))
        .collect();
    let pos_revenue = pos_in_range
        .iter()
        .map(|o| as_num(o.get("total")))
        .sum::<f64>();
    let cashier_revenue = cashier_revenue_in_range(&cashier_txs, range_start, range_end);
    let total_revenue = invoice_revenue + pos_revenue + cashier_revenue;

    let total_expenses = expenses
        .iter()
        .filter(|e| {
            matches!(
                e.get("status").and_then(|v| v.as_str()),
                Some("approved") | Some("pending")
            )
        })
        .filter(|e| expense_in_date_range(e, Some(range_start), Some(range_end)))
        .filter_map(|e| e.get("amount").and_then(|v| v.as_f64()))
        .sum::<f64>();

    let accounts_receivable = invoices
        .iter()
        .filter(|i| {
            matches!(
                i.get("status").and_then(|v| v.as_str()),
                Some("sent") | Some("overdue")
            )
        })
        .filter_map(|i| i.get("total").and_then(|v| v.as_f64()))
        .sum::<f64>();

    let accounts_payable = payments
        .iter()
        .filter(|p| p.get("status").and_then(|v| v.as_str()) == Some("pending"))
        .filter_map(|p| p.get("amount").and_then(|v| v.as_f64()))
        .sum::<f64>();

    let overdue_invoices = invoices
        .iter()
        .filter(|i| i.get("status").and_then(|v| v.as_str()) == Some("overdue"))
        .count();
    let pending_expenses = expenses
        .iter()
        .filter(|e| e.get("status").and_then(|v| v.as_str()) == Some("pending"))
        .count();

    action_ok(json!({
        "invoiceRevenue": invoice_revenue,
        "posRevenue": pos_revenue,
        "cashierRevenue": cashier_revenue,
        "posOrders": pos_in_range.len(),
        "totalRevenue": total_revenue,
        "totalExpenses": total_expenses,
        "netIncome": total_revenue - total_expenses,
        "accountsReceivable": accounts_receivable,
        "accountsPayable": accounts_payable,
        "overdueInvoices": overdue_invoices,
        "pendingExpenses": pending_expenses,
        "period": {
            "start": ms_to_iso_safe(range_start),
            "end": ms_to_iso_safe(range_end)
        }
    }))
}

pub fn get_finance_monthly_trends(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
    months: Option<usize>,
) -> ActionResult<Vec<Value>> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target_org = match resolve_target_org(&session_org_id, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let count = months.unwrap_or(6).max(1).min(24);

    let invoices = read_org_docs(app, INVOICES, &target_org).unwrap_or_default();
    let expenses = read_org_docs(app, EXPENSES, &target_org).unwrap_or_default();
    let pos_orders = read_org_docs(app, POS_ORDERS, &target_org).unwrap_or_default();
    let cashier_txs = read_org_docs(app, CASHIER_TRANSACTIONS, &target_org).unwrap_or_default();

    let mut rows = Vec::with_capacity(count);
    let (current_year, current_month) = ms_to_ym(now_ms());
    for back in (0..count).rev() {
        let (year, month) = add_months(current_year, current_month, -(back as i32));
        let (start_ms, end_ms) = month_bounds_ms(year, month);
        let invoice_revenue = invoices
            .iter()
            .filter(|i| i.get("status").and_then(|v| v.as_str()) == Some("paid"))
            .filter(|i| in_date_range(i, "createdAt", Some(start_ms), Some(end_ms)))
            .filter_map(|i| i.get("total").and_then(|v| v.as_f64()))
            .sum::<f64>();
        let pos_revenue = pos_orders
            .iter()
            .filter(|o| pos_completed_in_range(o, start_ms, end_ms))
            .map(|o| as_num(o.get("total")))
            .sum::<f64>();
        let cashier_revenue = cashier_revenue_in_range(&cashier_txs, start_ms, end_ms);
        let revenue = invoice_revenue + pos_revenue + cashier_revenue;
        let expense = expenses
            .iter()
            .filter(|e| {
                matches!(
                    e.get("status").and_then(|v| v.as_str()),
                    Some("approved") | Some("pending")
                )
            })
            .filter(|e| expense_in_date_range(e, Some(start_ms), Some(end_ms)))
            .filter_map(|e| e.get("amount").and_then(|v| v.as_f64()))
            .sum::<f64>();
        rows.push(json!({
            "month": format!("{} {:02}", MONTH_SHORT[(month - 1) as usize], year % 100),
            "revenue": revenue,
            "expenses": expense
        }));
    }
    action_ok(rows)
}

fn maybe_mark_invoice_paid(app: &AppState, org_id: &str, invoice_id: Option<&Value>, status: Option<&Value>) {
    if status.and_then(|v| v.as_str()) != Some("completed") {
        return;
    }
    let invoice_id = match invoice_id.and_then(as_id) {
        Some(v) => v,
        None => return,
    };
    let mut invoices = match read_org_docs(app, INVOICES, org_id) {
        Ok(v) => v,
        Err(_) => return,
    };
    let mut invoice = match invoices
        .iter()
        .find(|d| id_matches(d, &invoice_id, &["invoiceId"]))
        .cloned()
    {
        Some(v) => v,
        None => return,
    };
    let invoice_total = invoice.get("total").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let payments = match read_org_docs(app, PAYMENTS, org_id) {
        Ok(v) => v,
        Err(_) => return,
    };
    let paid_amount = payments
        .iter()
        .filter(|p| field_id_eq(p, "invoiceId", &invoice_id))
        .filter(|p| p.get("status").and_then(|v| v.as_str()) == Some("completed"))
        .filter_map(|p| p.get("amount").and_then(|v| v.as_f64()))
        .sum::<f64>();
    if paid_amount < invoice_total {
        return;
    }
    if let Some(obj) = invoice.as_object_mut() {
        obj.insert("status".into(), json!("paid"));
        obj.insert("updatedAt".into(), json!(iso_now()));
    }
    let real_id = match doc_id(&invoice) {
        Some(v) => v,
        None => return,
    };
    let patch = invoice
        .as_object()
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter(|(k, _)| k == "status" || k == "updatedAt")
        .collect::<Map<_, _>>();
    let _ = update_doc_by_id(app, INVOICES, &real_id, patch);
    let _ = &mut invoices;
}

fn resolve_target_org(session_org_id: &str, org_id: Option<&str>) -> Result<String, String> {
    if let Some(target) = org_id {
        if target != session_org_id {
            return Err("Cannot access another organization".into());
        }
        return Ok(target.to_string());
    }
    Ok(session_org_id.to_string())
}

fn default_finance_settings() -> Value {
    serde_json::from_str(DEFAULT_FINANCE_SETTINGS_JSON).unwrap_or_else(|_| {
        json!({
            "defaultCurrency": "USD",
            "accountCategories": [],
            "paymentTypes": []
        })
    })
}

fn id_matches(doc: &Value, id: &str, fields: &[&str]) -> bool {
    if doc_id(doc).as_deref() == Some(id) {
        return true;
    }
    fields.iter().any(|field| field_id_eq(doc, field, id))
}

fn field_id_eq(doc: &Value, field: &str, id: &str) -> bool {
    doc.get(field).and_then(as_id).as_deref() == Some(id)
}

fn as_id(v: &Value) -> Option<String> {
    if let Some(s) = v.as_str() {
        return Some(s.to_string());
    }
    v.as_object()
        .and_then(|o| o.get("$oid"))
        .and_then(|x| x.as_str())
        .map(str::to_string)
}

fn expense_date_ms(doc: &Value) -> i64 {
    let date_ms = doc_date_ms(doc, "date");
    if date_ms > 0 {
        return date_ms;
    }
    doc_date_ms(doc, "createdAt")
}

fn expense_in_date_range(doc: &Value, start_ms: Option<i64>, end_ms: Option<i64>) -> bool {
    let mut ms = expense_date_ms(doc);
    if ms > 0 {
        let (year, _) = ms_to_ym(ms);
        if year < 2000 {
            ms = now_ms();
        }
    } else {
        return true;
    }
    if let Some(s) = start_ms {
        if ms < s {
            return false;
        }
    }
    if let Some(e) = end_ms {
        if ms > e {
            return false;
        }
    }
    true
}

fn doc_when_ms(doc: &Value) -> i64 {
    for key in ["completedAt", "createdAt", "date"] {
        if let Some(ms) = doc.get(key).and_then(|v| v.as_str()).and_then(parse_iso_ms) {
            if ms > 0 {
                return ms;
            }
        }
    }
    0
}

fn pos_completed_in_range(doc: &Value, start_ms: i64, end_ms: i64) -> bool {
    if doc.get("status").and_then(|v| v.as_str()) != Some("completed") {
        return false;
    }
    let ms = doc_when_ms(doc);
    ms >= start_ms && ms <= end_ms
}

fn as_num(v: Option<&Value>) -> f64 {
    let Some(x) = v else {
        return 0.0;
    };
    x.as_f64()
        .or_else(|| x.as_i64().map(|n| n as f64))
        .or_else(|| x.as_u64().map(|n| n as f64))
        .or_else(|| x.as_str().and_then(|s| s.parse().ok()))
        .unwrap_or(0.0)
}

fn sort_created_desc(a: &Value, b: &Value) -> std::cmp::Ordering {
    let ta = a.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
    let tb = b.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
    tb.cmp(ta)
}

fn sort_date_desc(a: &Value, b: &Value) -> std::cmp::Ordering {
    let ta = a.get("date").and_then(|v| v.as_str()).unwrap_or("");
    let tb = b.get("date").and_then(|v| v.as_str()).unwrap_or("");
    tb.cmp(ta)
}

fn compute_budget_spent(expenses: &[Value], budget: &Value) -> f64 {
    let category = budget.get("category").and_then(|v| v.as_str()).unwrap_or("");
    let start_ms = budget.get("startDate").and_then(|v| v.as_str()).and_then(parse_iso_ms);
    let end_ms = budget.get("endDate").and_then(|v| v.as_str()).and_then(parse_iso_ms);
    let rows = expenses
        .iter()
        .filter(|e| e.get("category").and_then(|v| v.as_str()) == Some(category))
        .filter(|e| {
            matches!(
                e.get("status").and_then(|v| v.as_str()),
                Some("approved") | Some("pending")
            )
        })
        .filter(|e| in_date_range(e, "date", start_ms, end_ms))
        .cloned()
        .collect::<Vec<_>>();
    sum_field(&rows, "amount")
}

fn sum_for_type(rows: &[Value], tx_type: &str) -> f64 {
    rows.iter()
        .filter(|r| r.get("type").and_then(|v| v.as_str()) == Some(tx_type))
        .filter_map(|r| r.get("amount").and_then(|v| v.as_f64()))
        .sum()
}

fn day_range_from_input(input: Option<&str>) -> (i64, i64, String) {
    let ms = input.and_then(parse_iso_ms).unwrap_or_else(now_ms);
    let days = ms.div_euclid(86_400_000);
    let start = days * 86_400_000;
    let end = start + 86_399_999;
    (start, end, ms_to_iso_safe(start))
}

fn parse_filter_start_ms(value: &str) -> Option<i64> {
    let value = value.trim();
    if value.is_empty() {
        return None;
    }
    if value.len() == 10 {
        return parse_iso_ms(&format!("{value}T00:00:00"));
    }
    parse_iso_ms(value)
}

fn parse_filter_end_ms(value: &str) -> Option<i64> {
    let value = value.trim();
    if value.is_empty() {
        return None;
    }
    if value.len() == 10 {
        return parse_iso_ms(&format!("{value}T23:59:59"));
    }
    parse_iso_ms(value)
}

fn end_of_day_ms(ms: i64) -> i64 {
    let days = ms.div_euclid(86_400_000);
    days * 86_400_000 + 86_399_999
}

fn current_month_range_ms(now: i64) -> (i64, i64) {
    let (year, month) = ms_to_ym(now);
    month_bounds_ms(year, month)
}

fn month_bounds_ms(year: i64, month: i64) -> (i64, i64) {
    let start_days = days_from_civil(year, month, 1);
    let (ny, nm) = add_months(year, month, 1);
    let next_days = days_from_civil(ny, nm, 1);
    (start_days * 86_400_000, next_days * 86_400_000 - 1)
}

fn ms_to_ym(ms: i64) -> (i64, i64) {
    let days = ms.div_euclid(86_400_000);
    let (y, m, _) = civil_from_days(days);
    (y, m)
}

fn add_months(year: i64, month: i64, delta: i32) -> (i64, i64) {
    let idx = (year * 12 + (month - 1)) + (delta as i64);
    let y = idx.div_euclid(12);
    let m = idx.rem_euclid(12) + 1;
    (y, m)
}

fn ms_to_iso_safe(ms: i64) -> String {
    crate::store_util::ms_to_iso(ms)
}

const MONTH_SHORT: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let y = if month <= 2 { year - 1 } else { year };
    let era = if y >= 0 { y / 400 } else { (y - 399) / 400 };
    let yoe = y - era * 400;
    let doy = (153 * (if month > 2 { month - 3 } else { month + 9 }) + 2) / 5 + day - 1;
    era * 146097 + yoe * 365 + yoe / 4 - yoe / 100 + doy
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

fn gl_doc_id(doc: &Value) -> String {
    doc_id(doc).unwrap_or_default()
}

fn maybe_post_invoice_gl(app: &AppState, org_id: &str, row: &Value) {
    let status = row.get("status").and_then(|v| v.as_str()).unwrap_or("");
    if !matches!(status, "sent" | "paid") {
        return;
    }
    let inv_id = row
        .get("invoiceId")
        .and_then(|v| v.as_str())
        .map(str::to_string)
        .unwrap_or_else(|| gl_doc_id(row));
    let amount = row.get("total").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let customer = row.get("customerName").and_then(|v| v.as_str());
    crate::accounting::service::try_post_invoice(app, org_id, &inv_id, amount, customer);
}

fn maybe_post_payment_gl(app: &AppState, org_id: &str, row: &Value) {
    if row.get("status").and_then(|v| v.as_str()) != Some("completed") {
        return;
    }
    if matches!(
        row.get("sourceType").and_then(|v| v.as_str()),
        Some("pos") | Some("cashier")
    ) {
        return;
    }
    let pay_id = gl_doc_id(row);
    let amount = row.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let method = row.get("method").and_then(|v| v.as_str());
    crate::accounting::service::try_post_payment(app, org_id, &pay_id, amount, method);
}

fn maybe_post_expense_gl(app: &AppState, org_id: &str, row: &Value) {
    if row.get("status").and_then(|v| v.as_str()) != Some("approved") {
        return;
    }
    if matches!(row.get("sourceType").and_then(|v| v.as_str()), Some("payroll")) {
        return;
    }
    let exp_id = gl_doc_id(row);
    let amount = row.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let cat = row.get("category").and_then(|v| v.as_str());
    crate::accounting::service::try_post_expense(app, org_id, &exp_id, amount, cat);
}

fn maybe_post_cashier_gl(app: &AppState, org_id: &str, row: &Value) {
    let tx_id = gl_doc_id(row);
    let tx_type = row.get("type").and_then(|v| v.as_str()).unwrap_or("");
    let amount = row.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let desc = row.get("description").and_then(|v| v.as_str());
    crate::accounting::service::try_post_cashier(app, org_id, &tx_id, tx_type, amount, desc);
}

pub fn record_pos_payment(app: &AppState, org_id: &str, order: &Value) -> Result<(), String> {
    if order.get("status").and_then(|v| v.as_str()) != Some("completed") {
        return Ok(());
    }
    let id = doc_id(order).ok_or_else(|| "POS order id missing".to_string())?;
    let source_ref = format!("pos:{id}");
    if payment_source_exists(app, org_id, &source_ref)? {
        return Ok(());
    }
    let amount = as_num(order.get("total"));
    if amount <= 0.0 {
        return Ok(());
    }
    let mut doc = Map::new();
    doc.insert("amount".into(), json!(amount));
    doc.insert(
        "method".into(),
        json!(map_pos_payment_method(
            order.get("paymentMethod").and_then(|v| v.as_str())
        )),
    );
    doc.insert("status".into(), json!("completed"));
    doc.insert("sourceType".into(), json!("pos"));
    doc.insert("sourceRef".into(), json!(source_ref));
    doc.insert("sourceId".into(), json!(id));
    if let Some(order_no) = order.get("orderId").and_then(|v| v.as_str()) {
        doc.insert("transactionId".into(), json!(order_no));
    }
    if let Some(reference) = order.get("paymentReference").and_then(|v| v.as_str()) {
        doc.insert("reference".into(), json!(reference));
    }
    doc.insert("notes".into(), json!("POS sale"));
    if let Some(name) = order
        .get("completedByName")
        .or_else(|| order.get("createdByName"))
        .and_then(|v| v.as_str())
    {
        doc.insert("receivedBy".into(), json!(name));
    }
    if let Some(at) = order.get("completedAt").or_else(|| order.get("createdAt")) {
        doc.insert("createdAt".into(), at.clone());
    }
    insert_org_doc(app, PAYMENTS, org_id, doc)?;
    Ok(())
}

pub fn record_cashier_payment(app: &AppState, org_id: &str, tx: &Value) -> Result<(), String> {
    let tx_type = tx.get("type").and_then(|v| v.as_str()).unwrap_or("");
    if !matches!(tx_type, "sale" | "deposit" | "refund" | "withdrawal") {
        return Ok(());
    }
    let id = doc_id(tx).ok_or_else(|| "Cashier transaction id missing".to_string())?;
    let source_ref = format!("cashier:{id}");
    if payment_source_exists(app, org_id, &source_ref)? {
        return Ok(());
    }
    let amount = as_num(tx.get("amount")).abs();
    if amount <= 0.0 {
        return Ok(());
    }
    let mut doc = Map::new();
    doc.insert("amount".into(), json!(amount));
    doc.insert(
        "method".into(),
        json!(map_cashier_payment_method(
            tx.get("paymentMethod").and_then(|v| v.as_str())
        )),
    );
    doc.insert(
        "status".into(),
        json!(if matches!(tx_type, "refund" | "withdrawal") {
            "completed"
        } else {
            "completed"
        }),
    );
    doc.insert("sourceType".into(), json!("cashier"));
    doc.insert("sourceRef".into(), json!(source_ref));
    doc.insert("sourceId".into(), json!(id));
    if let Some(reference) = tx.get("reference").and_then(|v| v.as_str()) {
        doc.insert("transactionId".into(), json!(reference));
        doc.insert("reference".into(), json!(reference));
    }
    let notes = tx
        .get("description")
        .and_then(|v| v.as_str())
        .unwrap_or(match tx_type {
            "sale" => "Cashier sale",
            "deposit" => "Cashier deposit",
            "refund" => "Cashier refund",
            _ => "Cashier withdrawal",
        });
    doc.insert("notes".into(), json!(notes));
    if tx.get("isSchoolPayment").and_then(|v| v.as_bool()) == Some(true) {
        doc.insert("isSchoolPayment".into(), json!(true));
        if let Some(student) = tx.get("studentName").and_then(|v| v.as_str()) {
            doc.insert("studentName".into(), json!(student));
        }
        if let Some(pt) = tx.get("paymentType").and_then(|v| v.as_str()) {
            doc.insert("paymentType".into(), json!(pt));
        }
    }
    if let Some(name) = tx.get("cashierName").and_then(|v| v.as_str()) {
        doc.insert("receivedBy".into(), json!(name));
    }
    if let Some(at) = tx.get("createdAt") {
        doc.insert("createdAt".into(), at.clone());
    }
    insert_org_doc(app, PAYMENTS, org_id, doc)?;
    Ok(())
}

pub fn record_payroll_expense(app: &AppState, org_id: &str, record: &Value) -> Result<(), String> {
    let id = doc_id(record).ok_or_else(|| "Payroll record id missing".to_string())?;
    let source_ref = format!("payroll:{id}");
    if expense_source_exists(app, org_id, &source_ref)? {
        return Ok(());
    }
    let gross = as_num(record.get("gross"));
    if gross <= 0.0 {
        return Ok(());
    }
    let employee = record
        .get("employeeName")
        .and_then(|v| v.as_str())
        .or_else(|| record.get("employeeId").and_then(|v| v.as_str()))
        .unwrap_or("Employee");
    let period = record
        .get("payPeriod")
        .and_then(|v| v.as_str())
        .unwrap_or("Pay period");
    let net = record
        .get("net")
        .or_else(|| record.get("netPay"))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    let paye = record
        .get("zwPaye")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    let nssa = record
        .get("zwNssaEmployee")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);

    let mut doc = Map::new();
    doc.insert("amount".into(), json!(gross));
    doc.insert("category".into(), json!("Payroll"));
    doc.insert("status".into(), json!("approved"));
    doc.insert("sourceType".into(), json!("payroll"));
    doc.insert("sourceRef".into(), json!(source_ref));
    doc.insert("sourceId".into(), json!(id));
    doc.insert(
        "description".into(),
        json!(format!("Salary — {employee} — {period}")),
    );
    doc.insert(
        "notes".into(),
        json!(format!(
            "Zimbabwe payroll · Gross {gross:.2} · Net {net:.2} · PAYE {paye:.2} · NSSA {nssa:.2}"
        )),
    );
    doc.insert("currency".into(), json!("USD"));
    let now = iso_now();
    doc.insert("date".into(), json!(now));
    doc.insert("createdAt".into(), json!(now));
    insert_org_doc(app, EXPENSES, org_id, doc)?;
    Ok(())
}

fn repair_payroll_expense_dates(app: &AppState, org_id: &str) -> Result<(), String> {
    let expenses = read_org_docs(app, EXPENSES, org_id)?;
    let now = iso_now();
    for exp in expenses {
        if exp.get("sourceType").and_then(|v| v.as_str()) != Some("payroll") {
            continue;
        }
        let ms = expense_date_ms(&exp);
        let broken = ms == 0 || ms_to_ym(ms).0 < 2000;
        if !broken {
            continue;
        }
        let Some(id) = doc_id(&exp) else {
            continue;
        };
        let mut patch = Map::new();
        patch.insert("date".into(), json!(now));
        patch.insert("createdAt".into(), json!(now));
        patch.insert("updatedAt".into(), json!(now));
        let _ = update_doc_by_id(app, EXPENSES, &id, patch);
    }
    Ok(())
}

pub fn sync_payroll_expenses_for_org(app: &AppState, org_id: &str) -> Result<(), String> {
    let records = read_org_docs(app, PAYROLL_RECORDS, org_id)?;
    for record in records {
        if let Err(e) = record_payroll_expense(app, org_id, &record) {
            eprintln!("[finance] payroll expense sync failed: {e}");
        }
    }
    repair_payroll_expense_dates(app, org_id)
}

fn expense_source_exists(app: &AppState, org_id: &str, source_ref: &str) -> Result<bool, String> {
    let expenses = read_org_docs(app, EXPENSES, org_id)?;
    Ok(expenses
        .iter()
        .any(|e| e.get("sourceRef").and_then(|v| v.as_str()) == Some(source_ref)))
}

pub fn sync_ops_payments_for_org(app: &AppState, org_id: &str) -> Result<(), String> {
    let pos_orders = read_org_docs(app, POS_ORDERS, org_id)?;
    for order in pos_orders {
        if let Err(e) = record_pos_payment(app, org_id, &order) {
            eprintln!("[finance] POS payment sync failed: {e}");
        }
    }
    let cashier_txs = read_org_docs(app, CASHIER_TRANSACTIONS, org_id)?;
    for tx in cashier_txs {
        if let Err(e) = record_cashier_payment(app, org_id, &tx) {
            eprintln!("[finance] cashier payment sync failed: {e}");
        }
    }
    Ok(())
}

fn payment_source_exists(app: &AppState, org_id: &str, source_ref: &str) -> Result<bool, String> {
    let payments = read_org_docs(app, PAYMENTS, org_id)?;
    Ok(payments
        .iter()
        .any(|p| p.get("sourceRef").and_then(|v| v.as_str()) == Some(source_ref)))
}

fn map_pos_payment_method(method: Option<&str>) -> &'static str {
    match method {
        Some("card") => "credit_card",
        Some("bank_transfer") | Some("check") => "bank_transfer",
        _ => "cash",
    }
}

fn map_cashier_payment_method(method: Option<&str>) -> &'static str {
    match method {
        Some("card") | Some("credit_card") => "credit_card",
        Some("bank_transfer") | Some("check") => "bank_transfer",
        _ => "cash",
    }
}

fn cashier_revenue_in_range(rows: &[Value], start_ms: i64, end_ms: i64) -> f64 {
    rows.iter()
        .filter(|tx| {
            matches!(
                tx.get("type").and_then(|v| v.as_str()),
                Some("sale") | Some("deposit")
            )
        })
        .filter(|tx| in_date_range(tx, "createdAt", Some(start_ms), Some(end_ms)))
        .map(|tx| as_num(tx.get("amount")).abs())
        .sum::<f64>()
        - rows
            .iter()
            .filter(|tx| {
                matches!(
                    tx.get("type").and_then(|v| v.as_str()),
                    Some("refund") | Some("withdrawal")
                )
            })
            .filter(|tx| in_date_range(tx, "createdAt", Some(start_ms), Some(end_ms)))
            .map(|tx| as_num(tx.get("amount")).abs())
            .sum::<f64>()
}

