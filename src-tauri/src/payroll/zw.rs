use serde::Serialize;
use serde_json::{json, Map, Value};

/// Zimbabwe USD monthly payroll (ZIMRA PAYE + AIDS levy + NSSA) — simplified defaults.
pub const NSSA_INSURABLE_CEILING_USD: f64 = 700.0;
pub const NSSA_EMPLOYEE_RATE: f64 = 0.045;
pub const NSSA_EMPLOYER_RATE: f64 = 0.045;
pub const AIDS_LEVY_RATE: f64 = 0.03;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ZwPayrollBreakdown {
    pub country: String,
    pub currency: String,
    pub gross: f64,
    pub paye: f64,
    pub aids_levy: f64,
    pub nssa_employee: f64,
    pub nssa_employer: f64,
    pub total_deductions: f64,
    pub net: f64,
    pub employer_cost: f64,
}

pub fn calculate_zw_usd_monthly(gross: f64) -> ZwPayrollBreakdown {
    let gross = gross.max(0.0);
    let paye = calculate_paye_usd(gross);
    let aids_levy = (paye * AIDS_LEVY_RATE * 100.0).round() / 100.0;
    let insurable = gross.min(NSSA_INSURABLE_CEILING_USD);
    let nssa_employee = round2(insurable * NSSA_EMPLOYEE_RATE);
    let nssa_employer = round2(insurable * NSSA_EMPLOYER_RATE);
    let total_deductions = round2(paye + aids_levy + nssa_employee);
    let net = round2((gross - total_deductions).max(0.0));
    let employer_cost = round2(gross + nssa_employer);

    ZwPayrollBreakdown {
        country: "ZW".into(),
        currency: "USD".into(),
        gross,
        paye,
        aids_levy,
        nssa_employee,
        nssa_employer,
        total_deductions,
        net,
        employer_cost,
    }
}

fn calculate_paye_usd(gross: f64) -> f64 {
    if gross <= 100.0 {
        return 0.0;
    }
    if gross <= 500.0 {
        return round2((gross - 100.0) * 0.20);
    }
    if gross <= 1000.0 {
        return round2(80.0 + (gross - 500.0) * 0.25);
    }
    if gross <= 2000.0 {
        return round2(205.0 + (gross - 1000.0) * 0.30);
    }
    round2(505.0 + (gross - 2000.0) * 0.35)
}

fn round2(n: f64) -> f64 {
    (n * 100.0).round() / 100.0
}

pub fn apply_zw_defaults(mut payload: Map<String, Value>) -> Map<String, Value> {
    let country = payload
        .get("payrollCountry")
        .or_else(|| payload.get("country"))
        .and_then(|v| v.as_str())
        .unwrap_or("ZW");
    if country != "ZW" {
        return payload;
    }

    let gross = payload
        .get("gross")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    if gross <= 0.0 {
        return payload;
    }

    let breakdown = calculate_zw_usd_monthly(gross);
    payload.insert("payrollCountry".into(), json!("ZW"));
    payload.insert("currency".into(), json!("USD"));
    payload.insert("zwPaye".into(), json!(breakdown.paye));
    payload.insert("zwAidsLevy".into(), json!(breakdown.aids_levy));
    payload.insert("zwNssaEmployee".into(), json!(breakdown.nssa_employee));
    payload.insert("zwNssaEmployer".into(), json!(breakdown.nssa_employer));
    payload.insert("employerCost".into(), json!(breakdown.employer_cost));
    payload.insert("net".into(), json!(breakdown.net));
    payload.insert("netPay".into(), json!(breakdown.net));
    payload.insert(
        "deductions".into(),
        json!({
            "tax": breakdown.paye + breakdown.aids_levy,
            "insurance": breakdown.nssa_employee,
            "retirement": 0.0,
            "other": 0.0,
            "paye": breakdown.paye,
            "aidsLevy": breakdown.aids_levy,
            "nssaEmployee": breakdown.nssa_employee,
            "nssaEmployer": breakdown.nssa_employer,
        }),
    );
    payload
}

pub fn payroll_net_amount(record: &Value) -> f64 {
    record
        .get("net")
        .or_else(|| record.get("netPay"))
        .or_else(|| record.get("amount"))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0)
}

pub fn payroll_employer_cost(record: &Value) -> f64 {
    record
        .get("employerCost")
        .and_then(|v| v.as_f64())
        .unwrap_or_else(|| {
            let gross = record.get("gross").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let nssa_employer = record
                .get("zwNssaEmployer")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            gross + nssa_employer
        })
}
