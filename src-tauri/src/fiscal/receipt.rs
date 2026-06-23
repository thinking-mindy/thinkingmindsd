use serde_json::{json, Map, Value};

use crate::fiscal::constants::{MONEY_TYPE_CARD, MONEY_TYPE_CASH, ZIMRA_STANDARD_VAT_PERCENT};
use crate::fiscal::math::{round2, tax_from_exclusive, tax_from_inclusive};
use crate::fiscal::signature::{
    build_device_signature, build_receipt_sign_string, ReceiptTaxLine,
};

#[derive(Clone, Debug)]
pub struct PosFiscalLineItem {
    pub name: String,
    pub price: f64,
    pub quantity: f64,
    pub tax_percent: Option<f64>,
    pub hs_code: Option<String>,
}

#[derive(Clone, Debug)]
pub struct PosFiscalPayment {
    pub method: String,
    pub amount: f64,
}

#[derive(Clone, Debug)]
pub struct CreditDebitNoteRef {
    pub receipt_id: Option<i64>,
    pub device_id: Option<i64>,
    pub receipt_global_no: i64,
    pub fiscal_day_no: i64,
}

pub struct BuiltReceipt {
    pub receipt: Value,
    pub receipt_hash: String,
    pub receipt_signature: String,
    pub receipt_taxes: Vec<ReceiptTaxLine>,
    pub receipt_total: f64,
    pub receipt_date: String,
    pub receipt_payments: Vec<(i64, f64)>,
}

pub fn build_fiscal_receipt(
    device_id: i64,
    private_key_pem: &str,
    receipt_counter: i64,
    receipt_global_no: i64,
    invoice_no: &str,
    receipt_currency: &str,
    tax_inclusive: bool,
    items: &[PosFiscalLineItem],
    payments: &[PosFiscalPayment],
    applicable_taxes: Option<&[Value]>,
    previous_receipt_hash: Option<&str>,
    receipt_date: Option<&str>,
    receipt_type: Option<&str>,
    receipt_notes: Option<&str>,
    credit_debit_note: Option<&CreditDebitNoteRef>,
) -> Result<BuiltReceipt, String> {
    let receipt_type = receipt_type.unwrap_or("FISCALINVOICE");
    let is_credit = receipt_type == "CREDITNOTE";
    let sign = if is_credit { -1.0 } else { 1.0 };

    let receipt_date = receipt_date.map(|s| s.to_string()).unwrap_or_else(|| {
        let now = crate::store_util::iso_now();
        now.replace(".000Z", "").chars().take(19).collect()
    });

    let mut receipt_lines: Vec<Map<String, Value>> = Vec::new();
    for (index, item) in items.iter().enumerate() {
        let line_total = round2(item.price * item.quantity) * sign;
        let tax_percent = item.tax_percent.unwrap_or(ZIMRA_STANDARD_VAT_PERCENT);
        let tax_id = resolve_tax_id(tax_percent, applicable_taxes);
        let mut line = Map::new();
        line.insert("receiptLineType".into(), json!("Sale"));
        line.insert("receiptLineNo".into(), json!(index + 1));
        line.insert(
            "receiptLineHSCode".into(),
            json!(item.hs_code.as_deref().unwrap_or("04021099")),
        );
        line.insert("receiptLineName".into(), json!(item.name));
        line.insert("receiptLinePrice".into(), json!(item.price));
        line.insert("receiptLineQuantity".into(), json!(item.quantity));
        line.insert("receiptLineTotal".into(), json!(line_total));
        line.insert("taxID".into(), json!(tax_id));
        if tax_percent > 0.0 {
            line.insert("taxPercent".into(), json!(tax_percent));
        }
        receipt_lines.push(line);
    }

    let mut tax_groups: Vec<(i64, Option<f64>, f64)> = Vec::new();
    for line in &receipt_lines {
        let tax_id = line.get("taxID").and_then(|v| v.as_i64()).unwrap_or(515);
        let tax_percent = line.get("taxPercent").and_then(|v| v.as_f64());
        let line_total = line
            .get("receiptLineTotal")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        if let Some(entry) = tax_groups
            .iter_mut()
            .find(|(id, pct, _)| *id == tax_id && *pct == tax_percent)
        {
            entry.2 += line_total;
        } else {
            tax_groups.push((tax_id, tax_percent, line_total));
        }
    }

    let mut receipt_taxes: Vec<ReceiptTaxLine> = Vec::new();
    for (tax_id, tax_percent, sales_amount) in tax_groups {
        let rate = tax_percent.unwrap_or(0.0);
        let abs_sales = sales_amount.abs();
        let (tax_amount, sales_amount_with_tax) = if tax_inclusive {
            let sales_with_tax = round2(abs_sales) * sign;
            let tax_amt = tax_from_inclusive(abs_sales, rate) * sign;
            (tax_amt, sales_with_tax)
        } else {
            let pre_tax = round2(abs_sales);
            let tax_amt = tax_from_exclusive(pre_tax, rate) * sign;
            let sales_with_tax = round2(pre_tax + tax_amt.abs()) * sign;
            (tax_amt, sales_with_tax)
        };
        receipt_taxes.push(ReceiptTaxLine {
            tax_id,
            tax_percent,
            tax_amount: round2(tax_amount),
            sales_amount_with_tax: round2(sales_amount_with_tax),
        });
    }

    let receipt_total = if tax_inclusive {
        round2(
            receipt_lines
                .iter()
                .filter_map(|l| l.get("receiptLineTotal").and_then(|v| v.as_f64()))
                .sum(),
        )
    } else {
        round2(
            receipt_taxes
                .iter()
                .map(|t| t.sales_amount_with_tax)
                .sum(),
        )
    };

    let receipt_payments: Vec<(i64, f64)> = payments
        .iter()
        .map(|p| {
            (
                money_type_code(&p.method),
                round2(p.amount.abs()) * sign,
            )
        })
        .collect();

    let sign_string = build_receipt_sign_string(
        device_id,
        receipt_type,
        receipt_currency,
        receipt_global_no,
        &receipt_date,
        receipt_total,
        &receipt_taxes,
        previous_receipt_hash,
    );
    let (hash, signature) = build_device_signature(&sign_string, private_key_pem)?;

    let mut receipt = Map::new();
    receipt.insert("receiptType".into(), json!(receipt_type));
    receipt.insert("receiptCurrency".into(), json!(receipt_currency));
    receipt.insert("receiptCounter".into(), json!(receipt_counter));
    receipt.insert("receiptGlobalNo".into(), json!(receipt_global_no));
    receipt.insert("invoiceNo".into(), json!(invoice_no));
    receipt.insert("receiptDate".into(), json!(receipt_date));
    receipt.insert("receiptLinesTaxInclusive".into(), json!(tax_inclusive));
    receipt.insert(
        "receiptLines".into(),
        json!(receipt_lines.into_iter().map(Value::Object).collect::<Vec<_>>()),
    );
    receipt.insert(
        "receiptTaxes".into(),
        json!(receipt_taxes
            .iter()
            .map(|t| {
                let mut tax = Map::new();
                tax.insert("taxID".into(), json!(t.tax_id));
                tax.insert("taxAmount".into(), json!(t.tax_amount));
                tax.insert("salesAmountWithTax".into(), json!(t.sales_amount_with_tax));
                if let Some(p) = t.tax_percent {
                    tax.insert("taxPercent".into(), json!(p));
                }
                Value::Object(tax)
            })
            .collect::<Vec<_>>()),
    );
    receipt.insert(
        "receiptPayments".into(),
        json!(receipt_payments
            .iter()
            .map(|(code, amount)| {
                json!({"moneyTypeCode": code, "paymentAmount": amount})
            })
            .collect::<Vec<_>>()),
    );
    receipt.insert("receiptTotal".into(), json!(receipt_total));
    receipt.insert("receiptPrintForm".into(), json!("Receipt48"));
    receipt.insert(
        "receiptDeviceSignature".into(),
        json!({"hash": hash, "signature": signature}),
    );
    if let Some(notes) = receipt_notes {
        receipt.insert("receiptNotes".into(), json!(notes));
    }
    if let Some(cdn) = credit_debit_note {
        receipt.insert(
            "creditDebitNote".into(),
            json!({
                "receiptID": cdn.receipt_id,
                "deviceID": cdn.device_id,
                "receiptGlobalNo": cdn.receipt_global_no,
                "fiscalDayNo": cdn.fiscal_day_no,
            }),
        );
    }

    Ok(BuiltReceipt {
        receipt: Value::Object(receipt),
        receipt_hash: hash,
        receipt_signature: signature,
        receipt_taxes,
        receipt_total,
        receipt_date,
        receipt_payments,
    })
}

fn money_type_code(method: &str) -> i64 {
    if method == "card" {
        MONEY_TYPE_CARD
    } else {
        MONEY_TYPE_CASH
    }
}

fn resolve_tax_id(tax_percent: f64, applicable_taxes: Option<&[Value]>) -> i64 {
    if tax_percent == 0.0 {
        return 2;
    }
    if (tax_percent - 5.0).abs() < 0.001 {
        return 514;
    }
    if (tax_percent - 15.5).abs() < 0.001 {
        return 515;
    }
    if (tax_percent - 15.0).abs() < 0.001 {
        if let Some(taxes) = applicable_taxes {
            for t in taxes {
                if t.get("taxPercent").and_then(|v| v.as_f64()) == Some(15.0) {
                    if let Some(id) = t.get("taxID").and_then(|v| v.as_i64()) {
                        return id;
                    }
                }
            }
        }
        return 515;
    }
    if let Some(taxes) = applicable_taxes {
        for t in taxes {
            if t.get("taxPercent").and_then(|v| v.as_f64()) == Some(tax_percent) {
                if let Some(id) = t.get("taxID").and_then(|v| v.as_i64()) {
                    return id;
                }
            }
        }
    }
    515
}
