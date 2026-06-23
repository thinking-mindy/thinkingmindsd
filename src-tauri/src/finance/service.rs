use serde_json::{json, Map, Value};

use crate::admin::access::{doc_id, session_org};
use crate::admin::service::ActionResult;
use crate::auth::models::make_object_id;
use crate::auth::session::SessionState;
use crate::state::AppState;
use crate::store_util::{
    action_err, action_ok, delete_doc_by_id, in_date_range, insert_org_doc, iso_now, now_ms,
    parse_iso_ms, read_org_docs, sum_field, update_doc_by_id,
};

const INVOICES: &str = "invoices";
const PAYMENTS: &str = "payments";
const EXPENSES: &str = "expenses";
const FINANCE_SETTINGS: &str = "finance_settings";
const CASHIER_TRANSACTIONS: &str = "cashier_transactions";
const BUDGETS: &str = "budgets";
const POS_ORDERS: &str = "pos_orders";

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
    let start_ms = start_date.and_then(parse_iso_ms);
    let end_ms = end_date.and_then(parse_iso_ms).map(end_of_day_ms);
    let mut rows = match read_org_docs(app, EXPENSES, &target_org) {
        Ok(v) => v
            .into_iter()
            .filter(|d| in_date_range(d, "date", start_ms, end_ms))
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
    doc.insert("createdAt".into(), json!(iso_now()));

    let is_school_payment = doc
        .get("isSchoolPayment")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let student_id = doc
        .get("studentId")
        .and_then(|v| v.as_str())
        .map(str::to_string);

    if is_school_payment {
        if let Some(student_id) = student_id {
            if let Ok(Some(snapshot)) =
                crate::school::service::build_school_fee_snapshot(app, &org_id, &student_id, 0.0, None)
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
    let start_ms = start_date.and_then(parse_iso_ms);
    let end_ms = end_date.and_then(parse_iso_ms);
    let mut rows = match read_org_docs(app, CASHIER_TRANSACTIONS, &target_org) {
        Ok(v) => v
            .into_iter()
            .filter(|d| {
                if let Some(cid) = cashier_id {
                    if d.get("cashierId").and_then(|v| v.as_str()) != Some(cid) {
                        return false;
                    }
                }
                in_date_range(d, "createdAt", start_ms, end_ms)
            })
            .collect::<Vec<_>>(),
        Err(e) => return action_err(e),
    };
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

    let invoices = read_org_docs(app, INVOICES, &target_org).unwrap_or_default();
    let expenses = read_org_docs(app, EXPENSES, &target_org).unwrap_or_default();
    let payments = read_org_docs(app, PAYMENTS, &target_org).unwrap_or_default();
    let pos_orders = read_org_docs(app, POS_ORDERS, &target_org).unwrap_or_default();

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
    let total_revenue = invoice_revenue + pos_revenue;

    let total_expenses = expenses
        .iter()
        .filter(|e| {
            matches!(
                e.get("status").and_then(|v| v.as_str()),
                Some("approved") | Some("pending")
            )
        })
        .filter(|e| in_date_range(e, "date", Some(range_start), Some(range_end)))
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
        let revenue = invoice_revenue + pos_revenue;
        let expense = expenses
            .iter()
            .filter(|e| {
                matches!(
                    e.get("status").and_then(|v| v.as_str()),
                    Some("approved") | Some("pending")
                )
            })
            .filter(|e| in_date_range(e, "date", Some(start_ms), Some(end_ms)))
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
    let pay_id = gl_doc_id(row);
    let amount = row.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let method = row.get("method").and_then(|v| v.as_str());
    crate::accounting::service::try_post_payment(app, org_id, &pay_id, amount, method);
}

fn maybe_post_expense_gl(app: &AppState, org_id: &str, row: &Value) {
    if row.get("status").and_then(|v| v.as_str()) != Some("approved") {
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

