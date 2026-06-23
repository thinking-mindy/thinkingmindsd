use crate::fiscal::constants::ZIMRA_STANDARD_VAT_PERCENT;

pub fn round2(n: f64) -> f64 {
    (n * 100.0).round() / 100.0
}

pub fn tax_from_inclusive(sale_amount: f64, tax_rate: f64) -> f64 {
    if tax_rate == 0.0 {
        return 0.0;
    }
    let divisor = 1.0 + tax_rate / 100.0;
    let pre_tax = sale_amount / divisor;
    round2(sale_amount - pre_tax)
}

pub fn tax_from_exclusive(sale_amount: f64, tax_rate: f64) -> f64 {
    if tax_rate == 0.0 {
        return 0.0;
    }
    round2(sale_amount * (tax_rate / 100.0))
}

pub fn to_cents(amount: f64) -> i64 {
    (round2(amount) * 100.0).round() as i64
}

pub fn format_tax_percent_for_signature(tax_percent: Option<f64>) -> String {
    match tax_percent {
        None => String::new(),
        Some(p) => format!("{:.2}", p),
    }
}

pub fn default_vat_percent() -> f64 {
    ZIMRA_STANDARD_VAT_PERCENT
}
