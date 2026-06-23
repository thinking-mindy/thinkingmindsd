use serde_json::{json, Map, Value};

use crate::admin::access::session_org;
use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::state::AppState;
use crate::store_util::{
    action_err, action_ok, insert_org_doc, iso_now, read_org_docs, update_doc_by_id,
};

const COA: &str = "chart_of_accounts";
const JOURNAL: &str = "journal_entries";
const SETTINGS: &str = "accounting_settings";
const INVOICES: &str = "invoices";
const PAYMENTS: &str = "payments";
const EXPENSES: &str = "expenses";
const CASHIER: &str = "cashier_transactions";
const POS: &str = "pos_orders";
const PAYROLL: &str = "payroll_records";

const CASH: &str = "1000";
const BANK: &str = "1010";
const AR: &str = "1100";
const AP: &str = "2000";
const PAYROLL_PAYABLE: &str = "2100";
const EQUITY: &str = "3000";
const SALES: &str = "4000";
const POS_REV: &str = "4100";
const OPEX: &str = "5000";
const PAYROLL_EXP: &str = "5100";

fn default_coa() -> Vec<Value> {
    vec![
        json!({"code":"1000","name":"Cash on hand","type":"asset","enabled":true,"system":true}),
        json!({"code":"1010","name":"Bank","type":"asset","enabled":true,"system":true}),
        json!({"code":"1100","name":"Accounts receivable","type":"asset","enabled":true,"system":true}),
        json!({"code":"2000","name":"Accounts payable","type":"liability","enabled":true,"system":true}),
        json!({"code":"2100","name":"Payroll payable","type":"liability","enabled":true,"system":true}),
        json!({"code":"3000","name":"Owner equity","type":"equity","enabled":true,"system":true}),
        json!({"code":"4000","name":"Sales revenue","type":"revenue","enabled":true,"system":true}),
        json!({"code":"4100","name":"POS & cashier revenue","type":"revenue","enabled":true,"system":true}),
        json!({"code":"5000","name":"Operating expenses","type":"expense","enabled":true,"system":true}),
        json!({"code":"5100","name":"Payroll expense","type":"expense","enabled":true,"system":true}),
    ]
}

fn round2(n: f64) -> f64 {
    (n * 100.0).round() / 100.0
}

fn jl(code: &str, name: &str, debit: f64, credit: f64) -> Value {
    json!({"accountCode":code,"accountName":name,"debit":round2(debit),"credit":round2(credit)})
}

fn cash_acct(method: Option<&str>) -> (&'static str, &'static str) {
    match method {
        Some("bank_transfer") | Some("check") => (BANK, "Bank"),
        _ => (CASH, "Cash on hand"),
    }
}

pub fn ensure_seed(app: &AppState, org_id: &str) -> Result<(), String> {
    let coa = read_org_docs(app, COA, org_id).unwrap_or_default();
    if coa.is_empty() {
        for row in default_coa() {
            let mut doc = match row.as_object() {
                Some(v) => v.clone(),
                None => continue,
            };
            doc.insert("orgId".into(), json!(org_id));
            let _ = insert_org_doc(app, COA, org_id, doc);
        }
    }
    let settings = read_org_docs(app, SETTINGS, org_id).unwrap_or_default();
    if settings.is_empty() {
        let mut doc = Map::new();
        doc.insert("orgId".into(), json!(org_id));
        doc.insert("basis".into(), json!("hybrid"));
        doc.insert("fiscalYearStartMonth".into(), json!(1));
        doc.insert("autoPostFromOps".into(), json!(true));
        doc.insert("cashOpeningBalance".into(), json!(0));
        doc.insert("bankOpeningBalance".into(), json!(0));
        doc.insert("seededAt".into(), json!(iso_now()));
        let _ = insert_org_doc(app, SETTINGS, org_id, doc);
    }
    Ok(())
}

pub fn auto_post_enabled(app: &AppState, org_id: &str) -> bool {
    let _ = ensure_seed(app, org_id);
    read_org_docs(app, SETTINGS, org_id)
        .ok()
        .and_then(|rows| rows.into_iter().next())
        .and_then(|s| s.get("autoPostFromOps").and_then(|v| v.as_bool()))
        .unwrap_or(true)
}

pub fn post_journal(
    app: &AppState,
    org_id: &str,
    source_ref: &str,
    source_type: &str,
    source_id: Option<&str>,
    memo: &str,
    lines: Vec<Value>,
) -> Result<Option<Value>, String> {
    let _ = ensure_seed(app, org_id);
    let existing = read_org_docs(app, JOURNAL, org_id)
        .unwrap_or_default()
        .into_iter()
        .find(|e| e.get("sourceRef").and_then(|v| v.as_str()) == Some(source_ref));
    if existing.is_some() {
        return Ok(existing);
    }
    let mut doc = Map::new();
    doc.insert("orgId".into(), json!(org_id));
    doc.insert("date".into(), json!(iso_now()));
    doc.insert("memo".into(), json!(memo));
    doc.insert("sourceType".into(), json!(source_type));
    if let Some(id) = source_id {
        doc.insert("sourceId".into(), json!(id));
    }
    doc.insert("sourceRef".into(), json!(source_ref));
    doc.insert("lines".into(), json!(lines));
    doc.insert("status".into(), json!("posted"));
    doc.insert("postedAt".into(), json!(iso_now()));
    insert_org_doc(app, JOURNAL, org_id, doc).map(Some)
}

pub fn try_post_invoice(app: &AppState, org_id: &str, invoice_id: &str, amount: f64, customer: Option<&str>) {
    if !auto_post_enabled(app, org_id) {
        return;
    }
    let memo = match customer {
        Some(c) => format!("Invoice issued — {c}"),
        None => "Invoice issued".into(),
    };
    let lines = vec![
        jl(AR, "Accounts receivable", amount, 0.0),
        jl(SALES, "Sales revenue", 0.0, amount),
    ];
    let _ = post_journal(
        app,
        org_id,
        &format!("invoice:issued:{invoice_id}"),
        "invoice",
        Some(invoice_id),
        &memo,
        lines,
    );
}

pub fn try_post_payment(app: &AppState, org_id: &str, payment_id: &str, amount: f64, method: Option<&str>) {
    if !auto_post_enabled(app, org_id) {
        return;
    }
    let (acct, name) = cash_acct(method);
    let lines = vec![
        jl(acct, name, amount, 0.0),
        jl(AR, "Accounts receivable", 0.0, amount),
    ];
    let _ = post_journal(
        app,
        org_id,
        &format!("payment:completed:{payment_id}"),
        "payment",
        Some(payment_id),
        "Payment received",
        lines,
    );
}

pub fn try_post_expense(app: &AppState, org_id: &str, expense_id: &str, amount: f64, category: Option<&str>) {
    if !auto_post_enabled(app, org_id) {
        return;
    }
    let memo = match category {
        Some(c) => format!("Expense — {c}"),
        None => "Expense".into(),
    };
    let lines = vec![
        jl(OPEX, "Operating expenses", amount, 0.0),
        jl(AP, "Accounts payable", 0.0, amount),
    ];
    let _ = post_journal(
        app,
        org_id,
        &format!("expense:approved:{expense_id}"),
        "expense",
        Some(expense_id),
        &memo,
        lines,
    );
}

pub fn try_post_cashier(app: &AppState, org_id: &str, tx_id: &str, tx_type: &str, amount: f64, description: Option<&str>) {
    if !auto_post_enabled(app, org_id) {
        return;
    }
    let abs = amount.abs();
    if abs <= 0.0 {
        return;
    }
    let memo = description.unwrap_or(tx_type);
    let (lines, ref_key) = match tx_type {
        "sale" | "deposit" => (
            vec![
                jl(CASH, "Cash on hand", abs, 0.0),
                jl(POS_REV, "POS & cashier revenue", 0.0, abs),
            ],
            format!("cashier:{tx_type}:{tx_id}"),
        ),
        "refund" | "withdrawal" => (
            vec![
                jl(POS_REV, "POS & cashier revenue", abs, 0.0),
                jl(CASH, "Cash on hand", 0.0, abs),
            ],
            format!("cashier:{tx_type}:{tx_id}"),
        ),
        _ => return,
    };
    let _ = post_journal(app, org_id, &ref_key, "cashier", Some(tx_id), memo, lines);
}

pub fn try_post_payroll(app: &AppState, org_id: &str, record_id: &str, net_pay: f64, employee: Option<&str>) {
    if !auto_post_enabled(app, org_id) {
        return;
    }
    let memo = match employee {
        Some(e) => format!("Payroll — {e}"),
        None => "Payroll".into(),
    };
    let lines = vec![
        jl(PAYROLL_EXP, "Payroll expense", net_pay, 0.0),
        jl(PAYROLL_PAYABLE, "Payroll payable", 0.0, net_pay),
    ];
    let _ = post_journal(
        app,
        org_id,
        &format!("payroll:accrued:{record_id}"),
        "payroll",
        Some(record_id),
        &memo,
        lines,
    );
}

pub fn try_post_pos(app: &AppState, org_id: &str, order_id: &str, amount: f64) {
    if !auto_post_enabled(app, org_id) {
        return;
    }
    let lines = vec![
        jl(CASH, "Cash on hand", amount, 0.0),
        jl(POS_REV, "POS & cashier revenue", 0.0, amount),
    ];
    let _ = post_journal(
        app,
        org_id,
        &format!("pos:completed:{order_id}"),
        "pos",
        Some(order_id),
        "POS sale",
        lines,
    );
}

pub fn get_settings(app: &AppState, session: &SessionState, org_id: Option<&str>) -> ActionResult<Value> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target = org_id.unwrap_or(&session_org_id);
    if let Err(e) = ensure_seed(app, target) {
        return action_err(e);
    }
    let rows = match read_org_docs(app, SETTINGS, target) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    action_ok(rows.into_iter().next().unwrap_or(json!({"orgId":target,"basis":"hybrid","autoPostFromOps":true})))
}

pub fn update_settings(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
    patch: Value,
) -> ActionResult<bool> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    if org_id != session_org_id {
        return action_err("Forbidden");
    }
    let _ = ensure_seed(app, org_id);
    let rows = match read_org_docs(app, SETTINGS, org_id) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let first = match rows.first() {
        Some(v) => v.clone(),
        None => json!({"orgId":org_id}),
    };
    let id = first
        .get("_id")
        .and_then(|v| v.as_str())
        .map(str::to_string)
        .unwrap_or_default();
    let mut merged = match first.as_object() {
        Some(v) => v.clone(),
        None => Map::new(),
    };
    if let Some(p) = patch.as_object() {
        for (k, v) in p {
            merged.insert(k.clone(), v.clone());
        }
    }
    merged.insert("orgId".into(), json!(org_id));
    merged.insert("updatedAt".into(), json!(iso_now()));
    match update_doc_by_id(app, SETTINGS, &id, merged) {
        Ok(_) => action_ok(true),
        Err(e) => action_err(e),
    }
}

pub fn get_chart_of_accounts(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
) -> ActionResult<Vec<Value>> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target = org_id.unwrap_or(&session_org_id);
    let _ = ensure_seed(app, target);
    match read_org_docs(app, COA, target) {
        Ok(mut v) => {
            v.sort_by(|a, b| {
                a.get("code")
                    .and_then(|x| x.as_str())
                    .unwrap_or("")
                    .cmp(b.get("code").and_then(|x| x.as_str()).unwrap_or(""))
            });
            action_ok(v)
        }
        Err(e) => action_err(e),
    }
}

pub fn get_journal_entries(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
    limit: usize,
) -> ActionResult<Vec<Value>> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target = org_id.unwrap_or(&session_org_id);
    let mut rows = match read_org_docs(app, JOURNAL, target) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    rows.retain(|e| e.get("status").and_then(|v| v.as_str()) == Some("posted"));
    rows.sort_by(|a, b| {
        let am = a.get("postedAt").and_then(|v| v.as_str()).unwrap_or("");
        let bm = b.get("postedAt").and_then(|v| v.as_str()).unwrap_or("");
        bm.cmp(am)
    });
    rows.truncate(limit);
    action_ok(rows)
}

pub fn get_trial_balance(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
) -> ActionResult<Vec<Value>> {
    let coa = match get_chart_of_accounts(app, session, org_id) {
        ActionResult { success: true, data: Some(v), .. } => v,
        ActionResult { error: Some(e), .. } => return action_err(e),
        _ => return action_err("Failed to load COA"),
    };
    let journals = match get_journal_entries(app, session, org_id, 10_000) {
        ActionResult { success: true, data: Some(v), .. } => v,
        ActionResult { error: Some(e), .. } => return action_err(e),
        _ => return action_err("Failed to load journals"),
    };

    let mut totals: std::collections::HashMap<String, (f64, f64)> = std::collections::HashMap::new();
    for entry in &journals {
        if let Some(lines) = entry.get("lines").and_then(|v| v.as_array()) {
            for ln in lines {
                let code = ln.get("accountCode").and_then(|v| v.as_str()).unwrap_or("");
                let dr = ln.get("debit").and_then(|v| v.as_f64()).unwrap_or(0.0);
                let cr = ln.get("credit").and_then(|v| v.as_f64()).unwrap_or(0.0);
                let slot = totals.entry(code.to_string()).or_insert((0.0, 0.0));
                slot.0 += dr;
                slot.1 += cr;
            }
        }
    }

    let mut rows = Vec::new();
    for acct in coa {
        let code = acct.get("code").and_then(|v| v.as_str()).unwrap_or("");
        let name = acct.get("name").and_then(|v| v.as_str()).unwrap_or(code);
        let typ = acct.get("type").and_then(|v| v.as_str()).unwrap_or("asset");
        let (dr, cr) = totals.get(code).copied().unwrap_or((0.0, 0.0));
        let balance = if typ == "asset" || typ == "expense" {
            round2(dr - cr)
        } else {
            round2(cr - dr)
        };
        if dr > 0.0 || cr > 0.0 || balance.abs() > 0.001 {
            rows.push(json!({
                "code": code,
                "name": name,
                "type": typ,
                "debit": round2(dr),
                "credit": round2(cr),
                "balance": balance,
            }));
        }
    }
    action_ok(rows)
}

pub fn get_statements(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
) -> ActionResult<Value> {
    let tb = match get_trial_balance(app, session, org_id) {
        ActionResult { success: true, data: Some(v), .. } => v,
        ActionResult { error: Some(e), .. } => return action_err(e),
        _ => return action_err("Failed trial balance"),
    };
    let mut revenue = 0.0;
    let mut expenses = 0.0;
    let mut assets = 0.0;
    let mut liabilities = 0.0;
    let mut is_lines = Vec::new();
    for row in &tb {
        let typ = row.get("type").and_then(|v| v.as_str()).unwrap_or("");
        let bal = row.get("balance").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let code = row.get("code").and_then(|v| v.as_str()).unwrap_or("");
        let name = row.get("name").and_then(|v| v.as_str()).unwrap_or("");
        match typ {
            "revenue" => {
                revenue += bal;
                is_lines.push(json!({"code":code,"name":name,"amount":bal,"section":"revenue"}));
            }
            "expense" => {
                expenses += bal;
                is_lines.push(json!({"code":code,"name":name,"amount":bal,"section":"expense"}));
            }
            "asset" => assets += bal,
            "liability" => liabilities += bal,
            _ => {}
        }
    }
    action_ok(json!({
        "basis": "hybrid",
        "incomeStatement": {
            "revenue": round2(revenue),
            "expenses": round2(expenses),
            "payroll": 0.0,
            "netIncome": round2(revenue - expenses),
            "lines": is_lines,
        },
        "balanceSheet": {
            "assets": round2(assets),
            "liabilities": round2(liabilities),
            "equity": round2(assets - liabilities),
            "lines": [],
        },
        "trialBalance": tb,
    }))
}

pub fn backfill(app: &AppState, session: &SessionState, org_id: Option<&str>) -> ActionResult<Value> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target = org_id.unwrap_or(&session_org_id).to_string();
    let _ = ensure_seed(app, &target);
    let mut posted = 0usize;

    let invoices = read_org_docs(app, INVOICES, &target).unwrap_or_default();
    for inv in invoices {
        let status = inv.get("status").and_then(|v| v.as_str()).unwrap_or("");
        if !matches!(status, "sent" | "paid" | "overdue") {
            continue;
        }
        let id = inv
            .get("invoiceId")
            .or_else(|| inv.get("_id"))
            .map(|v| v.to_string())
            .unwrap_or_default();
        let amount = inv.get("total").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let customer = inv.get("customerName").and_then(|v| v.as_str());
        try_post_invoice(app, &target, &id.trim_matches('"'), amount, customer);
        posted += 1;
    }

    let payments = read_org_docs(app, PAYMENTS, &target).unwrap_or_default();
    for p in payments {
        if p.get("status").and_then(|v| v.as_str()) != Some("completed") {
            continue;
        }
        let id = p.get("_id").map(|v| v.to_string()).unwrap_or_default();
        let amount = p.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let method = p.get("method").and_then(|v| v.as_str());
        try_post_payment(app, &target, &id.trim_matches('"'), amount, method);
        posted += 1;
    }

    let expenses = read_org_docs(app, EXPENSES, &target).unwrap_or_default();
    for e in expenses {
        if e.get("status").and_then(|v| v.as_str()) != Some("approved") {
            continue;
        }
        let id = e.get("_id").map(|v| v.to_string()).unwrap_or_default();
        let amount = e.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let cat = e.get("category").and_then(|v| v.as_str());
        try_post_expense(app, &target, &id.trim_matches('"'), amount, cat);
        posted += 1;
    }

    let cashier = read_org_docs(app, CASHIER, &target).unwrap_or_default();
    for tx in cashier {
        let id = tx.get("_id").map(|v| v.to_string()).unwrap_or_default();
        let tx_type = tx.get("type").and_then(|v| v.as_str()).unwrap_or("");
        let amount = tx.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let desc = tx.get("description").and_then(|v| v.as_str());
        try_post_cashier(app, &target, &id.trim_matches('"'), tx_type, amount, desc);
        posted += 1;
    }

    let pos = read_org_docs(app, POS, &target).unwrap_or_default();
    for o in pos {
        if o.get("status").and_then(|v| v.as_str()) != Some("completed") {
            continue;
        }
        let id = o.get("_id").map(|v| v.to_string()).unwrap_or_default();
        let amount = o.get("total").and_then(|v| v.as_f64()).unwrap_or(0.0);
        try_post_pos(app, &target, &id.trim_matches('"'), amount);
        posted += 1;
    }

    action_ok(json!({"posted": posted}))
}

pub fn reconcile(
    app: &AppState,
    session: &SessionState,
    org_id: &str,
    counted_cash: f64,
    counted_bank: f64,
    notes: Option<&str>,
) -> ActionResult<Value> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    if org_id != session_org_id {
        return action_err("Forbidden");
    }
    let tb = match get_trial_balance(app, session, Some(org_id)) {
        ActionResult { success: true, data: Some(v), .. } => v,
        ActionResult { error: Some(e), .. } => return action_err(e),
        _ => return action_err("Trial balance failed"),
    };
    let book_cash = tb
        .iter()
        .find(|r| r.get("code").and_then(|v| v.as_str()) == Some(CASH))
        .and_then(|r| r.get("balance").and_then(|v| v.as_f64()))
        .unwrap_or(0.0);
    let book_bank = tb
        .iter()
        .find(|r| r.get("code").and_then(|v| v.as_str()) == Some(BANK))
        .and_then(|r| r.get("balance").and_then(|v| v.as_f64()))
        .unwrap_or(0.0);
    let cash_diff = round2(counted_cash - book_cash);
    let bank_diff = round2(counted_bank - book_bank);
    let memo = notes.unwrap_or("Reconciliation adjustment");
    if cash_diff.abs() > 0.01 {
        let lines = if cash_diff > 0.0 {
            vec![
                jl(CASH, "Cash on hand", cash_diff, 0.0),
                jl("4200", "Other income", 0.0, cash_diff),
            ]
        } else {
            let abs = -cash_diff;
            vec![
                jl(OPEX, "Operating expenses", abs, 0.0),
                jl(CASH, "Cash on hand", 0.0, abs),
            ]
        };
        let _ = post_journal(
            app,
            org_id,
            &format!("reconciliation:cash:{}", iso_now()),
            "reconciliation",
            None,
            memo,
            lines,
        );
    }
    if bank_diff.abs() > 0.01 {
        let lines = if bank_diff > 0.0 {
            vec![
                jl(BANK, "Bank", bank_diff, 0.0),
                jl("4200", "Other income", 0.0, bank_diff),
            ]
        } else {
            let abs = -bank_diff;
            vec![
                jl(OPEX, "Operating expenses", abs, 0.0),
                jl(BANK, "Bank", 0.0, abs),
            ]
        };
        let _ = post_journal(
            app,
            org_id,
            &format!("reconciliation:bank:{}", iso_now()),
            "reconciliation",
            None,
            memo,
            lines,
        );
    }
    let _ = update_settings(
        app,
        session,
        org_id,
        json!({
            "cashOpeningBalance": counted_cash,
            "bankOpeningBalance": counted_bank,
            "lastReconciledAt": iso_now(),
        }),
    );
    action_ok(json!({
        "bookCash": book_cash,
        "bookBank": book_bank,
        "countedCash": counted_cash,
        "countedBank": counted_bank,
        "cashDiff": cash_diff,
        "bankDiff": bank_diff,
    }))
}
