import { formatMoney } from "../../utils/currency.js";
type JsonMap = Record<string, unknown>;

export type PayslipDocument = {
  payslipNo: string;
  monthLabel: string;
  payPeriod: string;
  generatedDate: string;
  paymentMode: string;
  status: string;
  employeeName: string;
  empCode: string;
  department: string;
  designation: string;
  bankName: string;
  bankAccount: string;
  panNumber: string;
  pfNo: string;
  workedDays: number;
  paidLeaves: number;
  unpaidLeaves: number;
  earnings: {
    basicSalary: number;
    hra: number;
    allowances: number;
    overtimePay: number;
    holidayPay: number;
  };
  deductions: {
    pfDeduction: number;
    esiDeduction: number;
    ptDeduction: number;
    taxDeduction: number;
    leaveDeduction: number;
  };
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
};

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asRecord(value: unknown): JsonMap {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as JsonMap;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as JsonMap;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function formatDate(value: unknown): string {
  const raw = String(value ?? "").slice(0, 10);
  return raw || "—";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function lineItem(label: string, amount: number, tone: "earn" | "deduct"): string {
  if (amount <= 0) return "";
  const color = tone === "earn" ? "#065f46" : "#be123c";
  return `<div class="line"><span>${escapeHtml(label)}</span><strong style="color:${color}">${formatMoney(amount)}</strong></div>`;
}

export function buildPayslipDocument(
  payslip: Record<string, unknown>,
  employee: Record<string, unknown>,
  payroll?: Record<string, unknown> | null,
): PayslipDocument {
  const earningsRaw = asRecord(payslip.earnings);
  const deductionsRaw = asRecord(payslip.deductions);
  const payrollEarnings = asRecord(payroll?.earningsBreakdown ?? payroll?.earnings_breakdown);
  const payrollDeductions = asRecord(payroll?.deductionsBreakdown ?? payroll?.deductions_breakdown);

  const earnings = {
    basicSalary: asNumber(
      earningsRaw.basicSalary ?? payrollEarnings.basicSalary ?? payrollEarnings.basic_salary,
    ),
    hra: asNumber(earningsRaw.hra ?? payrollEarnings.hra),
    allowances: asNumber(earningsRaw.allowances ?? payrollEarnings.allowances),
    overtimePay: asNumber(earningsRaw.overtimePay ?? payrollEarnings.overtimePay),
    holidayPay: asNumber(earningsRaw.holidayPay ?? payrollEarnings.holidayPay),
  };

  const deductions = {
    pfDeduction: asNumber(
      deductionsRaw.pfDeduction ??
        payrollDeductions.pfDeduction ??
        payrollDeductions.pf_deduction,
    ),
    esiDeduction: asNumber(deductionsRaw.esiDeduction ?? payrollDeductions.esiDeduction),
    ptDeduction: asNumber(deductionsRaw.ptDeduction ?? payrollDeductions.ptDeduction),
    taxDeduction: asNumber(
      deductionsRaw.taxDeduction ??
        deductionsRaw.tdsDeduction ??
        payrollDeductions.tdsDeduction ??
        payrollDeductions.tds_deduction,
    ),
    leaveDeduction: asNumber(deductionsRaw.leaveDeduction ?? payrollDeductions.leaveDeduction),
  };

  const grossSalary = asNumber(
    payslip.grossSalary ?? payroll?.grossSalary ?? payroll?.gross_salary,
  );
  const totalDeductions = asNumber(
    payslip.totalDeductions ??
      payslip.total_deductions ??
      payroll?.deductionsTotal ??
      payroll?.deductions_total,
  );
  const netSalary = asNumber(payslip.netSalary ?? payslip.net_salary ?? payroll?.netSalary);

  const computedGross =
    grossSalary ||
    earnings.basicSalary + earnings.hra + earnings.allowances + earnings.overtimePay + earnings.holidayPay;
  const computedDeductions =
    totalDeductions ||
    deductions.pfDeduction +
      deductions.esiDeduction +
      deductions.ptDeduction +
      deductions.taxDeduction +
      deductions.leaveDeduction;
  const computedNet = netSalary || Math.max(0, computedGross - computedDeductions);

  return {
    payslipNo: String(payslip.payslipNo ?? payslip.payslip_no ?? "Payslip"),
    monthLabel: String(payslip.monthLabel ?? payslip.month_label ?? "—"),
    payPeriod: String(payslip.payPeriod ?? payslip.pay_period ?? payslip.monthLabel ?? "—"),
    generatedDate: formatDate(payslip.generatedDate ?? payslip.generated_date),
    paymentMode: String(payslip.paymentMode ?? payslip.payment_mode ?? "Bank Transfer"),
    status: String(payslip.status ?? "Generated"),
    employeeName: String(employee.name ?? "Employee"),
    empCode: String(employee.empCode ?? employee.emp_code ?? "—"),
    department: String(employee.department ?? "—"),
    designation: String(employee.designation ?? "—"),
    bankName: String(employee.bankName ?? employee.bank_name ?? "—"),
    bankAccount: String(employee.bankAccount ?? employee.bank_account ?? "—"),
    panNumber: String(employee.panNumber ?? employee.pan_number ?? "—"),
    pfNo: String(employee.uanNumber ?? employee.uan_number ?? "—"),
    workedDays: asNumber(payslip.workedDays ?? payslip.worked_days, 0),
    paidLeaves: asNumber(payslip.paidLeaves ?? payslip.paid_leaves, 0),
    unpaidLeaves: asNumber(payslip.unpaidLeaves ?? payslip.unpaid_leaves, 0),
    earnings,
    deductions,
    grossSalary: computedGross,
    totalDeductions: computedDeductions,
    netSalary: computedNet,
  };
}

export function renderPayslipHtml(doc: PayslipDocument): string {
  const earningLines = [
    lineItem("Basic Salary", doc.earnings.basicSalary, "earn"),
    lineItem("House Rent Allowance (HRA)", doc.earnings.hra, "earn"),
    lineItem("Allowances", doc.earnings.allowances, "earn"),
    lineItem("Overtime Pay", doc.earnings.overtimePay, "earn"),
    lineItem("Holiday Pay", doc.earnings.holidayPay, "earn"),
  ].join("");

  const deductionLines = [
    lineItem("Provident Fund (PF)", doc.deductions.pfDeduction, "deduct"),
    lineItem("ESI Insurance", doc.deductions.esiDeduction, "deduct"),
    lineItem("Professional Tax (PT)", doc.deductions.ptDeduction, "deduct"),
    lineItem("TDS / Income Tax", doc.deductions.taxDeduction, "deduct"),
    lineItem("Leave Deduction", doc.deductions.leaveDeduction, "deduct"),
  ].join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(doc.payslipNo)} — ${escapeHtml(doc.monthLabel)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 24px; background: #f8fafc; }
    .sheet { max-width: 820px; margin: 0 auto; background: #fff; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; }
    .header { display: flex; justify-content: space-between; gap: 16px; padding: 24px; border-bottom: 1px solid #e2e8f0; }
    .brand h1 { margin: 0; font-size: 20px; letter-spacing: 0.04em; text-transform: uppercase; }
    .brand p { margin: 4px 0 0; font-size: 11px; color: #64748b; }
    .badge { background: #0f172a; color: #fbbf24; font-weight: 700; font-size: 11px; padding: 8px 12px; border-radius: 8px; text-align: right; }
    .badge small { display: block; color: #94a3b8; font-family: monospace; margin-top: 4px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .meta p { margin: 0 0 6px; }
    .meta strong { color: #0f172a; }
    .columns { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #e2e8f0; }
    .col-head { padding: 10px 16px; font-size: 11px; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .earn-head { background: #ecfdf5; color: #065f46; }
    .deduct-head { background: #fff1f2; color: #9f1239; border-left: 1px solid #e2e8f0; }
    .col-body { padding: 12px 16px; min-height: 180px; font-size: 12px; }
    .deduct-body { border-left: 1px solid #e2e8f0; }
    .line { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
    .line span { color: #475569; }
    .total { display: flex; justify-content: space-between; margin-top: 12px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-weight: 800; }
    .net { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 20px 24px; background: #0f172a; color: #fff; }
    .net-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
    .net-value { font-size: 28px; font-weight: 900; color: #34d399; }
    .footer { padding: 16px 24px 24px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; gap: 16px; }
    .sign { text-align: right; color: #334155; font-weight: 700; }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { border: none; border-radius: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand">
        <h1>Shaw Hotel &amp; Resort</h1>
        <p>HR Department · Employee Salary Statement</p>
        <p>Generated on ${escapeHtml(doc.generatedDate)} · Status: ${escapeHtml(doc.status)}</p>
      </div>
      <div class="badge">
        PAYSLIP
        <small>${escapeHtml(doc.payslipNo)}</small>
      </div>
    </div>

    <div class="meta">
      <div>
        <p><strong>Employee:</strong> ${escapeHtml(doc.employeeName)}</p>
        <p><strong>Employee ID:</strong> ${escapeHtml(doc.empCode)}</p>
        <p><strong>Department:</strong> ${escapeHtml(doc.department)}</p>
        <p><strong>Designation:</strong> ${escapeHtml(doc.designation)}</p>
        <p><strong>Pay Period:</strong> ${escapeHtml(doc.payPeriod)} (${escapeHtml(doc.monthLabel)})</p>
      </div>
      <div>
        <p><strong>Bank:</strong> ${escapeHtml(doc.bankName)}</p>
        <p><strong>Account No:</strong> ${escapeHtml(doc.bankAccount)}</p>
        <p><strong>PAN:</strong> ${escapeHtml(doc.panNumber)}</p>
        <p><strong>PF / UAN:</strong> ${escapeHtml(doc.pfNo)}</p>
        <p><strong>Payment Mode:</strong> ${escapeHtml(doc.paymentMode)}</p>
        <p><strong>Worked / Paid Days:</strong> ${doc.workedDays || "—"} / ${doc.paidLeaves} paid leaves</p>
      </div>
    </div>

    <div class="columns">
      <div>
        <div class="col-head earn-head">Earnings</div>
        <div class="col-body">
          ${earningLines || '<div class="line"><span>No earnings breakdown</span><strong>—</strong></div>'}
          <div class="total"><span>Total Earnings</span><span>${formatMoney(doc.grossSalary)}</span></div>
        </div>
      </div>
      <div>
        <div class="col-head deduct-head">Deductions</div>
        <div class="col-body deduct-body">
          ${deductionLines || '<div class="line"><span>No deductions breakdown</span><strong>—</strong></div>'}
          <div class="total"><span>Total Deductions</span><span>${formatMoney(doc.totalDeductions)}</span></div>
        </div>
      </div>
    </div>

    <div class="net">
      <div>
        <div class="net-label">Net salary payable</div>
        <div style="font-size:13px;color:#fde68a;margin-top:4px;">${escapeHtml(doc.monthLabel)} salary slip</div>
      </div>
      <div class="net-value">${formatMoney(doc.netSalary)}</div>
    </div>

    <div class="footer">
      <p>This is a computer-generated payslip and does not require a physical signature.</p>
      <div class="sign">
        <div style="border-bottom:1px solid #cbd5e1;padding-bottom:4px;margin-bottom:4px;">Authorized Signatory</div>
        HR Department
      </div>
    </div>
  </div>
</body>
</html>`;
}
