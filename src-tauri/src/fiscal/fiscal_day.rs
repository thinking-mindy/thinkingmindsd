use serde_json::{json, Value};

use crate::fiscal::math::{round2, to_cents};
use crate::fiscal::signature::{build_device_signature, ReceiptTaxLine};

#[derive(Clone, Debug)]
pub struct FiscalDayCounter {
    pub fiscal_counter_type: String,
    pub fiscal_counter_currency: String,
    pub fiscal_counter_tax_id: Option<i64>,
    pub fiscal_counter_tax_percent: Option<f64>,
    pub fiscal_counter_money_type: Option<i64>,
    pub fiscal_counter_value: f64,
}

fn counter_key(c: &FiscalDayCounter) -> String {
    format!(
        "{}|{}|{}|{}|{}",
        c.fiscal_counter_type,
        c.fiscal_counter_currency,
        c.fiscal_counter_tax_id.map(|v| v.to_string()).unwrap_or_default(),
        c.fiscal_counter_tax_percent
            .map(|v| format!("{v:.2}"))
            .unwrap_or_default(),
        c.fiscal_counter_money_type
            .map(|v| v.to_string())
            .unwrap_or_default(),
    )
}

fn upsert_counter(counters: &[FiscalDayCounter], next: FiscalDayCounter) -> Vec<FiscalDayCounter> {
    let key = counter_key(&next);
    let mut copy = counters.to_vec();
    if let Some(idx) = copy.iter().position(|c| counter_key(c) == key) {
        copy[idx].fiscal_counter_value =
            round2(copy[idx].fiscal_counter_value + next.fiscal_counter_value);
    } else {
        copy.push(next);
    }
    copy.into_iter()
        .filter(|c| c.fiscal_counter_value.abs() >= 0.005)
        .collect()
}

pub fn accumulate_sale_counters(
    counters: &[FiscalDayCounter],
    currency: &str,
    receipt_taxes: &[ReceiptTaxLine],
    payments: &[(i64, f64)],
) -> Vec<FiscalDayCounter> {
    let mut next = counters.to_vec();
    for tax in receipt_taxes {
        next = upsert_counter(
            &next,
            FiscalDayCounter {
                fiscal_counter_type: "SaleByTax".into(),
                fiscal_counter_currency: currency.into(),
                fiscal_counter_tax_id: Some(tax.tax_id),
                fiscal_counter_tax_percent: tax.tax_percent,
                fiscal_counter_money_type: None,
                fiscal_counter_value: tax.sales_amount_with_tax,
            },
        );
        next = upsert_counter(
            &next,
            FiscalDayCounter {
                fiscal_counter_type: "SaleTaxByTax".into(),
                fiscal_counter_currency: currency.into(),
                fiscal_counter_tax_id: Some(tax.tax_id),
                fiscal_counter_tax_percent: tax.tax_percent,
                fiscal_counter_money_type: None,
                fiscal_counter_value: tax.tax_amount,
            },
        );
    }
    for (money_type, amount) in payments {
        next = upsert_counter(
            &next,
            FiscalDayCounter {
                fiscal_counter_type: "BalanceByMoneyType".into(),
                fiscal_counter_currency: currency.into(),
                fiscal_counter_tax_id: None,
                fiscal_counter_tax_percent: None,
                fiscal_counter_money_type: Some(*money_type),
                fiscal_counter_value: *amount,
            },
        );
    }
    next
}

pub fn accumulate_credit_note_counters(
    counters: &[FiscalDayCounter],
    currency: &str,
    receipt_taxes: &[ReceiptTaxLine],
    payments: &[(i64, f64)],
) -> Vec<FiscalDayCounter> {
    let neg_taxes: Vec<ReceiptTaxLine> = receipt_taxes
        .iter()
        .map(|t| ReceiptTaxLine {
            tax_id: t.tax_id,
            tax_percent: t.tax_percent,
            tax_amount: -t.tax_amount.abs(),
            sales_amount_with_tax: -t.sales_amount_with_tax.abs(),
        })
        .collect();
    let neg_payments: Vec<(i64, f64)> = payments
        .iter()
        .map(|(code, amt)| (*code, -amt.abs()))
        .collect();
    let mut next = counters.to_vec();
    for tax in &neg_taxes {
        next = upsert_counter(
            &next,
            FiscalDayCounter {
                fiscal_counter_type: "CreditNoteByTax".into(),
                fiscal_counter_currency: currency.into(),
                fiscal_counter_tax_id: Some(tax.tax_id),
                fiscal_counter_tax_percent: tax.tax_percent,
                fiscal_counter_money_type: None,
                fiscal_counter_value: tax.sales_amount_with_tax,
            },
        );
        next = upsert_counter(
            &next,
            FiscalDayCounter {
                fiscal_counter_type: "CreditNoteTaxByTax".into(),
                fiscal_counter_currency: currency.into(),
                fiscal_counter_tax_id: Some(tax.tax_id),
                fiscal_counter_tax_percent: tax.tax_percent,
                fiscal_counter_money_type: None,
                fiscal_counter_value: tax.tax_amount,
            },
        );
    }
    for (money_type, amount) in &neg_payments {
        next = upsert_counter(
            &next,
            FiscalDayCounter {
                fiscal_counter_type: "BalanceByMoneyType".into(),
                fiscal_counter_currency: currency.into(),
                fiscal_counter_tax_id: None,
                fiscal_counter_tax_percent: None,
                fiscal_counter_money_type: Some(*money_type),
                fiscal_counter_value: *amount,
            },
        );
    }
    next
}

fn counter_order(counter_type: &str) -> i64 {
    match counter_type {
        "SaleByTax" => 1,
        "SaleTaxByTax" => 2,
        "CreditNoteByTax" => 3,
        "CreditNoteTaxByTax" => 4,
        "DebitNoteByTax" => 5,
        "DebitNoteTaxByTax" => 6,
        "BalanceByMoneyType" => 7,
        _ => 99,
    }
}

fn money_type_label(code: i64) -> &'static str {
    match code {
        0 => "CASH",
        1 => "CARD",
        _ => "",
    }
}

pub fn build_fiscal_day_sign_string(
    device_id: i64,
    fiscal_day_no: i64,
    fiscal_day_date: &str,
    fiscal_day_counters: &[FiscalDayCounter],
) -> String {
    let mut sorted: Vec<&FiscalDayCounter> = fiscal_day_counters
        .iter()
        .filter(|c| c.fiscal_counter_value.abs() >= 0.005)
        .collect();
    sorted.sort_by(|a, b| {
        let oa = counter_order(&a.fiscal_counter_type);
        let ob = counter_order(&b.fiscal_counter_type);
        if oa != ob {
            return oa.cmp(&ob);
        }
        if a.fiscal_counter_currency != b.fiscal_counter_currency {
            return a.fiscal_counter_currency.cmp(&b.fiscal_counter_currency);
        }
        let ta = a
            .fiscal_counter_tax_id
            .or(a.fiscal_counter_money_type)
            .map(|v| v.to_string())
            .unwrap_or_default();
        let tb = b
            .fiscal_counter_tax_id
            .or(b.fiscal_counter_money_type)
            .map(|v| v.to_string())
            .unwrap_or_default();
        ta.cmp(&tb)
    });

    let counters_part: String = sorted
        .iter()
        .map(|counter| {
            let tax_pct = counter
                .fiscal_counter_tax_percent
                .map(|p| format!("{p:.2}"))
                .unwrap_or_default();
            let money = counter
                .fiscal_counter_money_type
                .map(money_type_label)
                .unwrap_or("");
            let value = to_cents(counter.fiscal_counter_value);
            format!(
                "{}{}{}{}{}",
                counter.fiscal_counter_type.to_uppercase(),
                counter.fiscal_counter_currency.to_uppercase(),
                tax_pct,
                money,
                value
            )
        })
        .collect();

    format!("{device_id}{fiscal_day_no}{fiscal_day_date}{counters_part}")
}

pub fn build_close_day_payload(
    device_id: i64,
    fiscal_day_no: i64,
    fiscal_day_date: &str,
    fiscal_day_counters: &[FiscalDayCounter],
    receipt_counter: i64,
    private_key_pem: &str,
) -> Result<Value, String> {
    let sign_string = build_fiscal_day_sign_string(
        device_id,
        fiscal_day_no,
        fiscal_day_date,
        fiscal_day_counters,
    );
    let (hash, signature) = build_device_signature(&sign_string, private_key_pem)?;
    let non_zero: Vec<Value> = fiscal_day_counters
        .iter()
        .filter(|c| c.fiscal_counter_value.abs() >= 0.005)
        .map(counter_to_json)
        .collect();
    Ok(json!({
        "deviceID": device_id,
        "fiscalDayNo": fiscal_day_no,
        "fiscalDayCounters": non_zero,
        "fiscalDayDeviceSignature": {
            "hash": hash,
            "signature": signature,
        },
        "receiptCounter": receipt_counter,
    }))
}

pub fn fiscal_day_date_from_opened_at(opened_at: Option<&str>) -> String {
    match opened_at {
        Some(v) if v.len() >= 10 => v[..10].to_string(),
        _ => {
            let now = crate::store_util::iso_now();
            now[..10].to_string()
        }
    }
}

pub fn counters_from_json(values: &[Value]) -> Vec<FiscalDayCounter> {
    values
        .iter()
        .filter_map(|v| {
            Some(FiscalDayCounter {
                fiscal_counter_type: v.get("fiscalCounterType")?.as_str()?.to_string(),
                fiscal_counter_currency: v.get("fiscalCounterCurrency")?.as_str()?.to_string(),
                fiscal_counter_tax_id: v
                    .get("fiscalCounterTaxID")
                    .and_then(|x| x.as_i64()),
                fiscal_counter_tax_percent: v
                    .get("fiscalCounterTaxPercent")
                    .and_then(|x| x.as_f64()),
                fiscal_counter_money_type: v
                    .get("fiscalCounterMoneyType")
                    .and_then(|x| x.as_i64()),
                fiscal_counter_value: v.get("fiscalCounterValue")?.as_f64()?,
            })
        })
        .collect()
}

pub fn counters_to_json(counters: &[FiscalDayCounter]) -> Vec<Value> {
    counters.iter().map(counter_to_json).collect()
}

fn counter_to_json(c: &FiscalDayCounter) -> Value {
    let mut obj = serde_json::Map::new();
    obj.insert(
        "fiscalCounterType".into(),
        json!(c.fiscal_counter_type),
    );
    obj.insert(
        "fiscalCounterCurrency".into(),
        json!(c.fiscal_counter_currency),
    );
    if let Some(id) = c.fiscal_counter_tax_id {
        obj.insert("fiscalCounterTaxID".into(), json!(id));
    }
    if let Some(pct) = c.fiscal_counter_tax_percent {
        obj.insert("fiscalCounterTaxPercent".into(), json!(pct));
    }
    if let Some(mt) = c.fiscal_counter_money_type {
        obj.insert("fiscalCounterMoneyType".into(), json!(mt));
    }
    obj.insert("fiscalCounterValue".into(), json!(c.fiscal_counter_value));
    Value::Object(obj)
}
