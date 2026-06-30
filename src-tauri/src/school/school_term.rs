use serde::Serialize;
use serde_json::Value;

use crate::store_util::parse_iso_ms;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SchoolTerm {
    pub id: String,
    pub label: String,
    pub short_label: String,
    pub start_ms: i64,
    pub end_ms: i64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentTermFeeBalance {
    pub term_id: String,
    pub term_label: String,
    pub term_short_label: String,
    pub fees_per_term: f64,
    pub paid_this_term: f64,
    pub remaining_balance: f64,
    pub percent_paid: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub class_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub student_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub student_number: Option<String>,
    pub has_class_fees: bool,
}

pub fn get_school_term_for_ms(ms: i64) -> SchoolTerm {
    let (year, month, _day) = ymd_from_ms(ms);
    if month <= 4 {
        SchoolTerm {
            id: format!("{year}-T1"),
            label: format!("Term 1 · Jan–Apr {year}"),
            short_label: format!("T1 {year}"),
            start_ms: ms_from_ymdhms(year, 1, 1, 0, 0, 0),
            end_ms: ms_from_ymdhms(year, 4, 30, 23, 59, 59) + 999,
        }
    } else if month <= 8 {
        SchoolTerm {
            id: format!("{year}-T2"),
            label: format!("Term 2 · May–Aug {year}"),
            short_label: format!("T2 {year}"),
            start_ms: ms_from_ymdhms(year, 5, 1, 0, 0, 0),
            end_ms: ms_from_ymdhms(year, 8, 31, 23, 59, 59) + 999,
        }
    } else {
        SchoolTerm {
            id: format!("{year}-T3"),
            label: format!("Term 3 · Sep–Dec {year}"),
            short_label: format!("T3 {year}"),
            start_ms: ms_from_ymdhms(year, 9, 1, 0, 0, 0),
            end_ms: ms_from_ymdhms(year, 12, 31, 23, 59, 59) + 999,
        }
    }
}

pub fn transaction_in_term(tx: &Value, term: &SchoolTerm) -> bool {
    if let Some(term_id) = tx.get("schoolTermId").and_then(|v| v.as_str()) {
        return term_id == term.id;
    }
    let created = tx
        .get("createdAt")
        .and_then(|v| v.as_str())
        .and_then(parse_iso_ms)
        .unwrap_or(0);
    created >= term.start_ms && created <= term.end_ms
}

pub fn school_payment_delta(tx_type: Option<&str>, amount: Option<f64>) -> f64 {
    let n = amount.unwrap_or(0.0).abs();
    if matches!(tx_type, Some("refund") | Some("withdrawal")) {
        -n
    } else {
        n
    }
}

pub fn school_payment_counts_for_term_balance(tx: &Value) -> bool {
    let id = tx
        .get("paymentTypeId")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_lowercase();
    let name = tx
        .get("paymentType")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_lowercase();
    if id == "transport" || name.contains("transport") {
        return false;
    }
    if id == "uniform-fee" || name.contains("uniform") {
        return false;
    }
    true
}

pub fn is_school_payment_type(payment_type_id: Option<&str>, payment_type: Option<&str>) -> bool {
    let id = payment_type_id.unwrap_or("").to_lowercase();
    let name = payment_type.unwrap_or("").to_lowercase();
    if matches!(id.as_str(), "tuition-fees" | "transport" | "uniform-fee") {
        return true;
    }
    name.contains("tuition")
        || name.contains("transport")
        || name.contains("uniform")
        || name.contains("school fee")
}

pub fn compute_term_fee_balance(
    fees_per_term: f64,
    transactions: &[Value],
    student_id: &str,
    term: Option<SchoolTerm>,
    additional_payment: f64,
    exclude_tx_id: Option<&str>,
    student_name: Option<String>,
    student_number: Option<String>,
    class_name: Option<String>,
) -> StudentTermFeeBalance {
    let resolved_term = term.unwrap_or_else(|| get_school_term_for_ms(now_ms()));
    let mut paid = 0.0_f64;
    for tx in transactions {
        if tx
            .get("isSchoolPayment")
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
            != true
        {
            continue;
        }
        if tx
            .get("studentId")
            .and_then(value_to_id)
            .map(|id| id != student_id)
            .unwrap_or(true)
        {
            continue;
        }
        if let Some(excluded) = exclude_tx_id {
            if tx
                .get("_id")
                .and_then(value_to_id)
                .map(|id| id == excluded)
                .unwrap_or(false)
            {
                continue;
            }
        }
        if !school_payment_counts_for_term_balance(tx) {
            continue;
        }
        if !transaction_in_term(tx, &resolved_term) {
            continue;
        }
        paid += school_payment_delta(
            tx.get("type").and_then(|v| v.as_str()),
            tx.get("amount").and_then(|v| v.as_f64()),
        );
    }

    let paid = paid.max(0.0);
    let fees_per_term = fees_per_term.max(0.0);
    let tuition_additional = if additional_payment > 0.0 {
        additional_payment.max(0.0)
    } else {
        0.0
    };
    let with_additional = paid + tuition_additional;
    let remaining = (fees_per_term - with_additional).max(0.0);
    let percent_paid = if fees_per_term > 0.0 {
        ((with_additional / fees_per_term) * 100.0).round().clamp(0.0, 100.0) as i64
    } else {
        0
    };

    StudentTermFeeBalance {
        term_id: resolved_term.id,
        term_label: resolved_term.label,
        term_short_label: resolved_term.short_label,
        fees_per_term,
        paid_this_term: with_additional,
        remaining_balance: remaining,
        percent_paid,
        class_name,
        student_name,
        student_number,
        has_class_fees: fees_per_term > 0.0,
    }
}

fn value_to_id(value: &Value) -> Option<String> {
    value
        .as_str()
        .map(str::to_string)
        .or_else(|| {
            value
                .as_object()
                .and_then(|o| o.get("$oid"))
                .and_then(|v| v.as_str())
                .map(str::to_string)
        })
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn ms_from_ymdhms(year: i64, month: i64, day: i64, hour: i64, minute: i64, second: i64) -> i64 {
    let days = days_from_civil(year, month, day);
    (days * 86400 + hour * 3600 + minute * 60 + second) * 1000
}

fn ymd_from_ms(ms: i64) -> (i64, i64, i64) {
    let secs = ms.div_euclid(1000);
    let days = secs.div_euclid(86400);
    civil_from_days(days)
}

fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let y = if month <= 2 { year - 1 } else { year };
    let era = if year >= 0 { y / 400 } else { (y - 399) / 400 };
    let yoe = y - era * 400;
    let doy = (153 * (if month > 2 { month - 3 } else { month + 9 }) + 2) / 5 + day - 1;
    yoe * 365 + yoe / 4 - yoe / 100 + doy + era * 146097
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
