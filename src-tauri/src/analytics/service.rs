use serde_json::{json, Value};

use crate::admin::access::session_org;
use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::state::AppState;
use crate::store_util::{action_err, action_ok, now_ms, parse_iso_ms, read_org_docs};

type ReportsRange = String;

const USERS: &str = "users";
const INVOICES: &str = "invoices";
const PAYMENTS: &str = "payments";
const EXPENSES: &str = "expenses";
const PROJECTS: &str = "projects";
const TASKS: &str = "tasks";
const CONTACTS: &str = "contacts";
const HELPDESK_TICKETS: &str = "helpdesk_tickets";
const POS_ORDERS: &str = "pos_orders";
const INVENTORY_ITEMS: &str = "inventory_items";

pub fn get_finance_analytics(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
) -> ActionResult<Value> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target_org = resolve_target_org(&session_org_id, org_id);

    let invoices = read_org_docs(app, INVOICES, &target_org).unwrap_or_default();
    let expenses = read_org_docs(app, EXPENSES, &target_org).unwrap_or_default();
    let pos_orders = read_org_docs(app, POS_ORDERS, &target_org).unwrap_or_default();

    let invoice_revenue = invoices
        .iter()
        .filter(|inv| inv.get("status").and_then(|v| v.as_str()) == Some("paid"))
        .map(|inv| as_num(inv.get("total")))
        .sum::<f64>();
    let pos_revenue = pos_orders
        .iter()
        .filter(|o| o.get("status").and_then(|v| v.as_str()) == Some("completed"))
        .map(|o| as_num(o.get("total")))
        .sum::<f64>();
    let total_revenue = invoice_revenue + pos_revenue;

    let total_expenses = expenses
        .iter()
        .filter(|exp| exp.get("status").and_then(|v| v.as_str()) == Some("approved"))
        .map(|exp| as_num(exp.get("amount")))
        .sum::<f64>();

    let total_profit = total_revenue - total_expenses;
    let pending_payments = invoices
        .iter()
        .filter(|inv| matches!(inv.get("status").and_then(|v| v.as_str()), Some("sent") | Some("overdue")))
        .map(|inv| as_num(inv.get("total")))
        .sum::<f64>();
    let overdue_invoices = invoices
        .iter()
        .filter(|inv| inv.get("status").and_then(|v| v.as_str()) == Some("overdue"))
        .count();
    let pending_expenses = expenses
        .iter()
        .filter(|exp| exp.get("status").and_then(|v| v.as_str()) == Some("pending"))
        .count();
    let invoices_paid = invoices
        .iter()
        .filter(|inv| inv.get("status").and_then(|v| v.as_str()) == Some("paid"))
        .count();

    let revenue_progress = pct_progress(total_revenue, 100_000.0);
    let profit_progress = pct_progress(total_profit, 50_000.0);
    let expenses_progress = pct_progress(total_expenses, 50_000.0);
    let payments_progress = pct_progress(pending_payments, 20_000.0);
    let invoices_progress = pct_progress(invoices_paid as f64, 200.0);

    action_ok(json!({
        "revenue": {
            "totalRevenue": format!("{:.2}", total_revenue),
            "invoiceRevenue": format!("{:.2}", invoice_revenue),
            "posRevenue": format!("{:.2}", pos_revenue),
            "profit": format!("{:.2}", total_profit),
            "overdueInvoices": overdue_invoices.to_string(),
            "pendingExpenses": pending_expenses.to_string(),
            "revenueProgress": revenue_progress,
            "profitProgress": profit_progress
        },
        "expenses": {
            "expenses": format!("{:.2}", total_expenses),
            "pendingPayments": format!("{:.2}", pending_payments),
            "invoicesPaid": invoices_paid.to_string(),
            "expensesProgress": expenses_progress,
            "paymentsProgress": payments_progress,
            "invoicesProgress": invoices_progress
        },
        "refunds": {
            "invoicesPaid": invoices_paid.to_string(),
            "invoicesProgress": invoices_progress
        }
    }))
}

pub fn get_hr_analytics(app: &AppState, session: &SessionState, org_id: Option<&str>) -> ActionResult<Value> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target_org = resolve_target_org(&session_org_id, org_id);

    let employees = read_org_docs(app, USERS, &target_org).unwrap_or_default();
    let tasks = read_org_docs(app, TASKS, &target_org).unwrap_or_default();
    let _projects = read_org_docs(app, PROJECTS, &target_org).unwrap_or_default();

    let total_employees = employees.len();
    let new_hires = employees
        .iter()
        .filter(|emp| within_last_days(emp.get("createdAt"), 30))
        .count();

    let open_positions = 5;
    let interviews_scheduled = tasks
        .iter()
        .filter(|t| field_contains(t, "name", "interview"))
        .count();
    let leaves_approved = 87;
    let training_sessions = tasks
        .iter()
        .filter(|t| field_contains(t, "name", "training"))
        .count();

    action_ok(json!({
        "employees": {
            "employees": total_employees.to_string(),
            "newHires": new_hires.to_string(),
            "openPositions": open_positions.to_string(),
            "employeesProgress": pct_progress(total_employees as f64, 200.0),
            "newHiresProgress": pct_progress(new_hires as f64, 10.0),
            "positionsProgress": pct_progress(open_positions as f64, 20.0)
        },
        "activities": {
            "interviewsScheduled": interviews_scheduled.to_string(),
            "leavesApproved": leaves_approved.to_string(),
            "trainingSessions": training_sessions.to_string(),
            "interviewsProgress": pct_progress(interviews_scheduled as f64, 30.0),
            "leavesProgress": pct_progress(leaves_approved as f64, 100.0),
            "trainingProgress": pct_progress(training_sessions as f64, 60.0)
        }
    }))
}

pub fn get_marketing_analytics(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
) -> ActionResult<Value> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(e) => return action_err(e),
    };
    let target_org = resolve_target_org(&session_org_id, org_id);

    let contacts = read_org_docs(app, CONTACTS, &target_org).unwrap_or_default();
    let projects = read_org_docs(app, PROJECTS, &target_org).unwrap_or_default();
    let _tickets = read_org_docs(app, HELPDESK_TICKETS, &target_org).unwrap_or_default();
    let expenses = read_org_docs(app, EXPENSES, &target_org).unwrap_or_default();

    let affiliate_leads = contacts
        .iter()
        .filter(|c| c.get("deals").and_then(|v| v.as_array()).map(|d| !d.is_empty()).unwrap_or(false))
        .count();
    let medium_campaigns = projects
        .iter()
        .filter(|p| field_contains(p, "name", "campaign"))
        .count();
    let website_referrals = contacts.len();
    let active_campaigns = projects
        .iter()
        .filter(|p| p.get("status").and_then(|v| v.as_str()) == Some("active"))
        .count();
    let leads_generated = contacts.len();
    let ad_spend_amount = expenses
        .iter()
        .filter(|exp| {
            let category = exp
                .get("category")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_ascii_lowercase();
            category.contains("advertising") || category.contains("marketing")
        })
        .map(|exp| as_num(exp.get("amount")))
        .sum::<f64>();

    let email_opens = 810_720usize;
    let social_engagement = 235_632usize;
    let landing_page_visits = 26_640usize;

    action_ok(json!({
        "affiliate": {
            "affiliateLeads": affiliate_leads.to_string(),
            "mediumCampaigns": medium_campaigns.to_string(),
            "websiteReferrals": website_referrals.to_string(),
            "affiliateProgress": pct_progress(affiliate_leads as f64, 2000.0),
            "campaignsProgress": pct_progress(medium_campaigns as f64, 5000.0),
            "referralsProgress": pct_progress(website_referrals as f64, 600.0)
        },
        "campaign": {
            "activeCampaigns": active_campaigns.to_string(),
            "leadsGenerated": leads_generated.to_string(),
            "adSpend": format!("{:.2}", ad_spend_amount),
            "activeCampaignsProgress": pct_progress(active_campaigns as f64, 20.0),
            "leadsProgress": pct_progress(leads_generated as f64, 20_000.0),
            "adSpendProgress": pct_progress(ad_spend_amount, 3000.0)
        },
        "engagement": {
            "emailOpens": email_opens.to_string(),
            "socialEngagement": social_engagement.to_string(),
            "landingPageVisits": landing_page_visits.to_string(),
            "emailProgress": pct_progress(email_opens as f64, 1_000_000.0),
            "socialProgress": pct_progress(social_engagement as f64, 300_000.0),
            "landingProgress": pct_progress(landing_page_visits as f64, 50_000.0)
        }
    }))
}

pub fn get_overview_analytics(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
) -> ActionResult<Value> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(_) => return action_ok(zero_overview()),
    };
    let target_org = resolve_target_org(&session_org_id, org_id);

    let invoices = read_org_docs(app, INVOICES, &target_org).unwrap_or_default();
    let expenses = read_org_docs(app, EXPENSES, &target_org).unwrap_or_default();
    let payments = read_org_docs(app, PAYMENTS, &target_org).unwrap_or_default();
    let pos_orders = read_org_docs(app, POS_ORDERS, &target_org).unwrap_or_default();
    let inventory_items = read_org_docs(app, INVENTORY_ITEMS, &target_org).unwrap_or_default();

    let paid_invoices: Vec<&Value> = invoices
        .iter()
        .filter(|inv| inv.get("status").and_then(|v| v.as_str()) == Some("paid"))
        .collect();
    let total_revenue = paid_invoices.iter().map(|inv| as_num(inv.get("total"))).sum::<f64>();
    let total_expenses = expenses
        .iter()
        .filter(|e| e.get("status").and_then(|v| v.as_str()) == Some("approved"))
        .map(|e| as_num(e.get("amount")))
        .sum::<f64>();
    let total_income = payments.iter().map(|p| as_num(p.get("amount"))).sum::<f64>();
    let pos_revenue = pos_orders
        .iter()
        .filter(|o| o.get("status").and_then(|v| v.as_str()) == Some("completed"))
        .map(|o| as_num(o.get("total")))
        .sum::<f64>();
    let total_sales = total_revenue + pos_revenue;

    let inventory_low_stock = inventory_items
        .iter()
        .filter(|i| as_num(i.get("quantity")) <= as_num(i.get("reorderLevel")).max(5.0))
        .count();
    let inventory_out_of_stock = inventory_items
        .iter()
        .filter(|i| as_num(i.get("quantity")) <= 0.0)
        .count();

    action_ok(json!({
        "income": total_income,
        "sales": total_sales,
        "expenses": total_expenses,
        "revenue": total_revenue,
        "customers": 0,
        "orders": pos_orders.len(),
        "ordersThisMonth": pos_orders.len(),
        "posRevenue": pos_revenue,
        "posRevenueThisMonth": pos_revenue,
        "inventoryTotalItems": inventory_items.len(),
        "inventoryLowStock": inventory_low_stock,
        "inventoryOutOfStock": inventory_out_of_stock
    }))
}

pub fn get_inventory_and_pos_analytics(
    app: &AppState,
    session: &SessionState,
    org_id: Option<&str>,
) -> ActionResult<Value> {
    let (_, session_org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(_) => return action_ok(zero_inventory_pos()),
    };
    let target_org = resolve_target_org(&session_org_id, org_id);

    let items = read_org_docs(app, INVENTORY_ITEMS, &target_org).unwrap_or_default();
    let orders = read_org_docs(app, POS_ORDERS, &target_org).unwrap_or_default();

    let low_stock = items
        .iter()
        .filter(|i| {
            let qty = as_num(i.get("quantity"));
            qty <= as_num(i.get("reorderLevel")).max(5.0) && qty > 0.0
        })
        .count();
    let out_of_stock = items
        .iter()
        .filter(|i| as_num(i.get("quantity")) <= 0.0)
        .count();
    let completed: Vec<&Value> = orders
        .iter()
        .filter(|o| o.get("status").and_then(|v| v.as_str()) == Some("completed"))
        .collect();
    let revenue = completed.iter().map(|o| as_num(o.get("total"))).sum::<f64>();

    let today_start = start_of_day_ms(now_ms());
    let today_end = today_start + 86_399_999;
    let (month_start, month_end) = {
        let (y, m) = ms_to_ym(now_ms());
        month_bounds_ms(y, m)
    };

    let orders_today = completed
        .iter()
        .filter(|o| in_ms_range(doc_when_ms(o), today_start, today_end))
        .count();
    let revenue_today = completed
        .iter()
        .filter(|o| in_ms_range(doc_when_ms(o), today_start, today_end))
        .map(|o| as_num(o.get("total")))
        .sum::<f64>();
    let orders_this_month = completed
        .iter()
        .filter(|o| in_ms_range(doc_when_ms(o), month_start, month_end))
        .count();
    let revenue_this_month = completed
        .iter()
        .filter(|o| in_ms_range(doc_when_ms(o), month_start, month_end))
        .map(|o| as_num(o.get("total")))
        .sum::<f64>();

    let total_items = items.len();
    let total_orders = completed.len();

    action_ok(json!({
        "inventory": {
            "totalItems": total_items.to_string(),
            "inStock": total_items.saturating_sub(out_of_stock).to_string(),
            "lowStock": low_stock.to_string(),
            "outOfStock": out_of_stock.to_string(),
            "inventoryProgress": total_items.min(100),
            "lowStockProgress": if total_items > 0 { ((low_stock * 100) / total_items) as i64 } else { 0 }
        },
        "pos": {
            "totalOrders": total_orders.to_string(),
            "ordersToday": orders_today.to_string(),
            "ordersThisMonth": orders_this_month.to_string(),
            "revenue": format!("{:.2}", revenue),
            "revenueToday": format!("{:.2}", revenue_today),
            "revenueThisMonth": format!("{:.2}", revenue_this_month),
            "posOrdersProgress": total_orders.min(100),
            "posRevenueProgress": pct_progress(revenue, 1000.0)
        }
    }))
}

pub fn get_reports_page_data(
    app: &AppState,
    session: &SessionState,
    range: Option<&str>,
) -> ActionResult<Value> {
    let (_, org_id) = match session_org(app, session) {
        Ok(v) => v,
        Err(_) => return action_ok(empty_reports(range.unwrap_or("30d").to_string())),
    };
    let selected_range = range.unwrap_or("30d").to_string();
    let (start_ms, end_ms, months) = reports_range_window(&selected_range);

    let pos_orders = read_org_docs(app, POS_ORDERS, &org_id).unwrap_or_default();
    let invoices = read_org_docs(app, INVOICES, &org_id).unwrap_or_default();
    let expenses = read_org_docs(app, EXPENSES, &org_id).unwrap_or_default();
    let inventory_items = read_org_docs(app, INVENTORY_ITEMS, &org_id).unwrap_or_default();

    let pos_in_range: Vec<&Value> = pos_orders
        .iter()
        .filter(|o| o.get("status").and_then(|v| v.as_str()) == Some("completed"))
        .filter(|o| in_ms_range(doc_when_ms(o), start_ms, end_ms))
        .collect();
    let pos_revenue = pos_in_range.iter().map(|o| as_num(o.get("total"))).sum::<f64>();

    let finance_revenue = invoices
        .iter()
        .filter(|inv| inv.get("status").and_then(|v| v.as_str()) == Some("paid"))
        .filter(|inv| in_ms_range(doc_when_ms(inv), start_ms, end_ms))
        .map(|inv| as_num(inv.get("total")))
        .sum::<f64>();

    let expense_total = expenses
        .iter()
        .filter(|exp| matches!(exp.get("status").and_then(|v| v.as_str()), Some("approved") | Some("pending")))
        .filter(|exp| in_ms_range(doc_when_ms(exp), start_ms, end_ms))
        .map(|exp| as_num(exp.get("amount")))
        .sum::<f64>();

    let low_stock = inventory_items
        .iter()
        .filter(|i| {
            let qty = as_num(i.get("quantity"));
            qty <= as_num(i.get("reorderLevel")).max(5.0) && qty > 0.0
        })
        .count();
    let out_of_stock = inventory_items
        .iter()
        .filter(|i| as_num(i.get("quantity")) <= 0.0)
        .count();

    let mut product_map: std::collections::BTreeMap<String, (f64, f64)> = std::collections::BTreeMap::new();
    for order in &pos_in_range {
        let items = order.get("items").and_then(|v| v.as_array()).cloned().unwrap_or_default();
        for item in items {
            let name = item
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown")
                .to_string();
            let qty = as_num(item.get("quantity"));
            let rev = as_num(item.get("price")) * qty;
            let entry = product_map.entry(name).or_insert((0.0, 0.0));
            entry.0 += qty;
            entry.1 += rev;
        }
    }
    let mut top_products: Vec<Value> = product_map
        .into_iter()
        .map(|(name, (quantity, revenue))| json!({ "name": name, "quantity": quantity as i64, "revenue": revenue }))
        .collect();
    top_products.sort_by(|a, b| {
        as_num(b.get("revenue"))
            .partial_cmp(&as_num(a.get("revenue")))
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    top_products.truncate(8);

    let mut payment_map: std::collections::BTreeMap<String, (i64, f64)> = std::collections::BTreeMap::new();
    for order in &pos_in_range {
        let method = order
            .get("paymentMethod")
            .and_then(|v| v.as_str())
            .unwrap_or("other")
            .to_string();
        let entry = payment_map.entry(method).or_insert((0, 0.0));
        entry.0 += 1;
        entry.1 += as_num(order.get("total"));
    }
    let mut payment_mix: Vec<Value> = payment_map
        .into_iter()
        .map(|(method, (count, amount))| json!({ "method": method, "count": count, "amount": amount }))
        .collect();
    payment_mix.sort_by(|a, b| {
        as_num(b.get("amount"))
            .partial_cmp(&as_num(a.get("amount")))
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let mut trend = Vec::new();
    let (cur_year, cur_month) = ms_to_ym(now_ms());
    for i in (0..months).rev() {
        let (y, m) = add_months(cur_year, cur_month, -(i as i32));
        let (bucket_start, bucket_end) = month_bounds_ms(y, m);
        let label = format!("{} {:02}", MONTH_SHORT[(m - 1) as usize], y % 100);

        let month_pos = pos_orders
            .iter()
            .filter(|o| o.get("status").and_then(|v| v.as_str()) == Some("completed"))
            .filter(|o| in_ms_range(doc_when_ms(o), bucket_start, bucket_end))
            .map(|o| as_num(o.get("total")))
            .sum::<f64>();
        let month_finance = invoices
            .iter()
            .filter(|inv| inv.get("status").and_then(|v| v.as_str()) == Some("paid"))
            .filter(|inv| in_ms_range(doc_when_ms(inv), bucket_start, bucket_end))
            .map(|inv| as_num(inv.get("total")))
            .sum::<f64>();
        let month_expenses = expenses
            .iter()
            .filter(|exp| matches!(exp.get("status").and_then(|v| v.as_str()), Some("approved") | Some("pending")))
            .filter(|exp| in_ms_range(doc_when_ms(exp), bucket_start, bucket_end))
            .map(|exp| as_num(exp.get("amount")))
            .sum::<f64>();

        trend.push(json!({
            "label": label,
            "posRevenue": month_pos,
            "financeRevenue": month_finance,
            "expenses": month_expenses
        }));
    }

    action_ok(json!({
        "range": selected_range,
        "summary": {
            "posRevenue": pos_revenue,
            "posOrders": pos_in_range.len(),
            "financeRevenue": finance_revenue,
            "expenses": expense_total,
            "netIncome": finance_revenue + pos_revenue - expense_total,
            "inventoryItems": inventory_items.len(),
            "lowStock": low_stock,
            "outOfStock": out_of_stock
        },
        "trend": trend,
        "topProducts": top_products,
        "paymentMix": payment_mix
    }))
}

fn resolve_target_org(session_org_id: &str, org_id: Option<&str>) -> String {
    org_id.unwrap_or(session_org_id).to_string()
}

fn pct_progress(value: f64, target: f64) -> i64 {
    if target <= 0.0 {
        return 0;
    }
    ((value / target) * 100.0).round().clamp(0.0, 100.0) as i64
}

fn as_num(v: Option<&Value>) -> f64 {
    if let Some(x) = v {
        if let Some(n) = x.as_f64() {
            return n;
        }
        if let Some(s) = x.as_str() {
            return s.parse::<f64>().unwrap_or(0.0);
        }
    }
    0.0
}

fn field_contains(doc: &Value, field: &str, needle: &str) -> bool {
    doc.get(field)
        .and_then(|v| v.as_str())
        .map(|s| s.to_ascii_lowercase().contains(&needle.to_ascii_lowercase()))
        .unwrap_or(false)
}

fn within_last_days(date: Option<&Value>, days: i64) -> bool {
    let Some(date_str) = date.and_then(|v| v.as_str()) else {
        return false;
    };
    let Some(ms) = parse_iso_ms(date_str) else {
        return false;
    };
    ms >= now_ms() - (days * 86_400_000)
}

fn zero_overview() -> Value {
    json!({
        "income": 0,
        "sales": 0,
        "expenses": 0,
        "revenue": 0,
        "customers": 0,
        "orders": 0,
        "ordersThisMonth": 0,
        "posRevenue": 0,
        "posRevenueThisMonth": 0,
        "inventoryTotalItems": 0,
        "inventoryLowStock": 0,
        "inventoryOutOfStock": 0
    })
}

fn zero_inventory_pos() -> Value {
    json!({
        "inventory": {
            "totalItems": "0",
            "inStock": "0",
            "lowStock": "0",
            "outOfStock": "0",
            "inventoryProgress": 0,
            "lowStockProgress": 0
        },
        "pos": {
            "totalOrders": "0",
            "ordersToday": "0",
            "ordersThisMonth": "0",
            "revenue": "0.00",
            "revenueToday": "0.00",
            "revenueThisMonth": "0.00",
            "posOrdersProgress": 0,
            "posRevenueProgress": 0
        }
    })
}

fn empty_reports(range: ReportsRange) -> Value {
    json!({
        "range": range,
        "summary": {
            "posRevenue": 0,
            "posOrders": 0,
            "financeRevenue": 0,
            "expenses": 0,
            "netIncome": 0,
            "inventoryItems": 0,
            "lowStock": 0,
            "outOfStock": 0
        },
        "trend": [],
        "topProducts": [],
        "paymentMix": []
    })
}

fn reports_range_window(range: &str) -> (i64, i64, usize) {
    let end = end_of_day_ms(now_ms());
    let mut start = end;
    let months = match range {
        "7d" => {
            start -= 6 * 86_400_000;
            6
        }
        "30d" => {
            start -= 29 * 86_400_000;
            6
        }
        "90d" => {
            start = add_months_start(now_ms(), -3);
            3
        }
        "12m" => {
            start = add_months_start(now_ms(), -12);
            12
        }
        _ => {
            start -= 29 * 86_400_000;
            6
        }
    };
    (start_of_day_ms(start), end, months)
}

fn doc_when_ms(doc: &Value) -> i64 {
    for key in ["completedAt", "createdAt", "date"] {
        if let Some(ms) = doc.get(key).and_then(|v| v.as_str()).and_then(parse_iso_ms) {
            return ms;
        }
    }
    0
}

fn in_ms_range(ms: i64, start_ms: i64, end_ms: i64) -> bool {
    ms >= start_ms && ms <= end_ms
}

fn start_of_day_ms(ms: i64) -> i64 {
    let days = ms.div_euclid(86_400_000);
    days * 86_400_000
}

fn end_of_day_ms(ms: i64) -> i64 {
    start_of_day_ms(ms) + 86_399_999
}

fn add_months_start(ms: i64, delta: i32) -> i64 {
    let (year, month) = ms_to_ym(ms);
    let (y, m) = add_months(year, month, delta);
    month_bounds_ms(y, m).0
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
    (idx.div_euclid(12), idx.rem_euclid(12) + 1)
}

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

const MONTH_SHORT: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
