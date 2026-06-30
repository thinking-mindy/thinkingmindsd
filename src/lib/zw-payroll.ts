/** Zimbabwe USD monthly payroll defaults (ZIMRA PAYE + AIDS + NSSA). */

export const NSSA_INSURABLE_CEILING_USD = 700;
export const NSSA_EMPLOYEE_RATE = 0.045;
export const NSSA_EMPLOYER_RATE = 0.045;
export const AIDS_LEVY_RATE = 0.03;

export type ZwPayrollBreakdown = {
  country: "ZW";
  currency: "USD";
  gross: number;
  paye: number;
  aidsLevy: number;
  nssaEmployee: number;
  nssaEmployer: number;
  totalDeductions: number;
  net: number;
  employerCost: number;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function calculateZwUsdMonthly(gross: number): ZwPayrollBreakdown {
  const g = Math.max(0, gross);
  let paye = 0;
  if (g > 100) {
    if (g <= 500) paye = (g - 100) * 0.2;
    else if (g <= 1000) paye = 80 + (g - 500) * 0.25;
    else if (g <= 2000) paye = 205 + (g - 1000) * 0.3;
    else paye = 505 + (g - 2000) * 0.35;
  }
  paye = round2(paye);
  const aidsLevy = round2(paye * AIDS_LEVY_RATE);
  const insurable = Math.min(g, NSSA_INSURABLE_CEILING_USD);
  const nssaEmployee = round2(insurable * NSSA_EMPLOYEE_RATE);
  const nssaEmployer = round2(insurable * NSSA_EMPLOYER_RATE);
  const totalDeductions = round2(paye + aidsLevy + nssaEmployee);
  const net = round2(Math.max(0, g - totalDeductions));
  const employerCost = round2(g + nssaEmployer);

  return {
    country: "ZW",
    currency: "USD",
    gross: g,
    paye,
    aidsLevy,
    nssaEmployee,
    nssaEmployer,
    totalDeductions,
    net,
    employerCost,
  };
}

export function payrollRecordNet(record: { net?: number; netPay?: number }): number {
  return Number(record.net ?? record.netPay ?? 0);
}
