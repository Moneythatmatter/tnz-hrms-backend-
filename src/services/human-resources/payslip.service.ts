import { hrModel, hrTables } from "../../models/human-resources/index.js";
import { newId } from "../../models/base.js";
import { monthLabel } from "./payroll-calculate.service.js";

type PayrollRow = {
  id: string;
  employeeId: string;
  payrollMonth: number;
  payrollYear: number;
  grossSalary: number;
  earningsTotal: number;
  deductionsTotal: number;
  netSalary: number;
  earningsBreakdown?: Record<string, number>;
  deductionsBreakdown?: Record<string, number>;
  payslipGenerated?: boolean;
};

type EmployeeRow = {
  id: string;
  empCode?: string;
  emp_code?: string;
};

function shortMonth(month: number) {
  const labels = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return labels[month] ?? String(month);
}

function buildPayslipNo(payroll: PayrollRow, emp: EmployeeRow) {
  const code = String(emp.empCode ?? emp.emp_code ?? emp.id.slice(0, 4)).replace(/\s+/g, "");
  return `PS-${payroll.payrollYear}-${String(payroll.payrollMonth).padStart(2, "0")}-${code}`;
}

async function findPayslipByPayrollId(payrollId: string) {
  const rows = await hrModel.list<Record<string, unknown>>(hrTables.payslips, {
    filters: { payroll_id: payrollId },
  });
  return rows[0] ?? null;
}

export async function generatePayslipForPayroll(payrollId: string) {
  const payroll = await hrModel.get<PayrollRow>(hrTables.payrollRecords, payrollId);
  if (!payroll) throw new Error("Payroll record not found");

  const employee = await hrModel.get<EmployeeRow>(hrTables.employees, payroll.employeeId);
  if (!employee) throw new Error("Employee not found");

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const earnings = payroll.earningsBreakdown ?? {};
  const deductions = payroll.deductionsBreakdown ?? {};
  const label = monthLabel(payroll.payrollMonth, payroll.payrollYear);
  const payPeriod = `${shortMonth(payroll.payrollMonth)} ${payroll.payrollYear}`;

  const existing = await findPayslipByPayrollId(payrollId);
  const payslipPayload = {
    payrollId,
    employeeId: payroll.employeeId,
    payslipNo: existing
      ? String(existing.payslipNo ?? existing.payslip_no)
      : buildPayslipNo(payroll, employee),
    monthLabel: label,
    payPeriod,
    generatedDate: today,
    paymentMode: "Bank Transfer",
    earnings,
    deductions,
    grossSalary: payroll.grossSalary,
    totalDeductions: payroll.deductionsTotal,
    netSalary: payroll.netSalary,
    status: existing?.status === "Sent" ? "Sent" : "Generated",
    updatedAt: now,
  };

  let payslip: Record<string, unknown>;
  if (existing) {
    if (existing.status === "Sent") {
      return existing;
    }
    payslip = await hrModel.update(
      hrTables.payslips,
      String(existing.id),
      payslipPayload,
    );
  } else {
    payslip = await hrModel.create(hrTables.payslips, {
      id: newId(),
      ...payslipPayload,
      sentDate: null,
      createdAt: now,
    });
  }

  await hrModel.update(hrTables.payrollRecords, payrollId, {
    payslipGenerated: true,
    updatedAt: now,
  });

  return payslip;
}

export async function sendPayslip(payslipId: string, sentBy = "HR Manager") {
  const payslip = await hrModel.get<Record<string, unknown>>(hrTables.payslips, payslipId);
  if (!payslip) throw new Error("Payslip not found");

  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  const updated = await hrModel.update(hrTables.payslips, payslipId, {
    status: "Sent",
    sentDate: today,
    updatedAt: now,
  });

  await hrModel.create(hrTables.auditLogs, {
    id: newId(),
    module: "payroll",
    action: `Sent payslip ${payslip.payslipNo ?? payslipId} to employee`,
    entityType: "payslip",
    entityId: payslipId,
    changedBy: sentBy,
  });

  return updated;
}

export async function sendPayslipsBatch(options: {
  month?: number;
  year?: number;
  payslipIds?: string[];
  sentBy?: string;
}) {
  const { month, year, payslipIds, sentBy = "HR Manager" } = options;
  let rows: Record<string, unknown>[] = [];

  if (payslipIds?.length) {
    rows = (
      await Promise.all(
        payslipIds.map((id) => hrModel.get<Record<string, unknown>>(hrTables.payslips, id)),
      )
    ).filter(Boolean) as Record<string, unknown>[];
  } else if (month && year) {
    const payrollRows = await hrModel.list<{ id: string }>(hrTables.payrollRecords, {
      filters: { payroll_month: month, payroll_year: year },
    });
    const payrollIds = payrollRows.map((p) => p.id);
    const allPayslips = await hrModel.list<Record<string, unknown>>(hrTables.payslips);
    rows = allPayslips.filter((p) =>
      payrollIds.includes(String(p.payrollId ?? p.payroll_id)),
    );
  } else {
    rows = await hrModel.list<Record<string, unknown>>(hrTables.payslips);
  }

  const toSend = rows.filter((p) => p.status !== "Sent");
  const sent = [];
  for (const p of toSend) {
    sent.push(await sendPayslip(String(p.id), sentBy));
  }
  return { sentCount: sent.length, payslips: sent };
}
