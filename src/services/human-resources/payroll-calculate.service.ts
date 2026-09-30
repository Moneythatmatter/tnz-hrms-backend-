import { hrModel, hrTables } from "../../models/human-resources/index.js";
import { newId } from "../../models/base.js";
import { enrichEmployee } from "./enrich.js";
import {
  resolveRevisionForPayPeriod,
  snapshotFromRevision,
  sumApprovedBonusesForPeriod,
} from "./compensation-revision.service.js";
import { payrollPayloadFromSnapshot } from "./compensation-snapshot.service.js";

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type EarningLine = { componentName?: string; computedAmount?: number };
type DeductionLine = { componentName?: string; computedAmount?: number };

type SalaryStructure = {
  id: string;
  name?: string;
  grossSalary?: number;
  gross_salary?: number;
  netSalary?: number;
  net_salary?: number;
  totalDeductions?: number;
  total_deductions?: number;
  earnings?: EarningLine[];
  deductions?: DeductionLine[];
};

type PayrollRow = {
  id: string;
  employeeId: string;
  payrollMonth: number;
  payrollYear: number;
  status: string;
  isLocked?: boolean;
};

const NON_RECALCULABLE = new Set(["Approved", "Partially Paid", "Paid"]);

function findEarning(struct: SalaryStructure, pattern: RegExp) {
  return (
    (struct.earnings ?? []).find((line) =>
      pattern.test(String(line.componentName ?? "").toLowerCase()),
    )?.computedAmount ?? 0
  );
}

function findDeduction(struct: SalaryStructure, pattern: RegExp) {
  return (
    (struct.deductions ?? []).find((line) =>
      pattern.test(String(line.componentName ?? "").toLowerCase()),
    )?.computedAmount ?? 0
  );
}

function buildBatchId(month: number, year: number) {
  return `PAY-${year}-${String(month).padStart(2, "0")}`;
}

async function findExistingPayroll(employeeId: string, month: number, year: number) {
  const rows = await hrModel.list<PayrollRow>(hrTables.payrollRecords, {
    filters: {
      employee_id: employeeId,
      payroll_month: month,
      payroll_year: year,
    },
  });
  if (rows[0]) return rows[0];

  const periodRows = await hrModel.list<PayrollRow>(hrTables.payrollRecords, {
    filters: { payroll_month: month, payroll_year: year },
  });
  return (
    periodRows.find((row) => {
      const rowEmployeeId = String(
        row.employeeId ?? (row as Record<string, unknown>).employee_id ?? "",
      );
      return rowEmployeeId === employeeId;
    }) ?? null
  );
}

async function upsertPayrollRecord(
  existing: PayrollRow | null,
  payload: Record<string, unknown>,
  employeeId: string,
  month: number,
  year: number,
) {
  if (existing) {
    return hrModel.update(hrTables.payrollRecords, existing.id, payload);
  }

  try {
    return await hrModel.create(hrTables.payrollRecords, {
      id: newId(),
      ...payload,
      createdAt: payload.updatedAt ?? new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (!/duplicate key|unique constraint/i.test(message)) {
      throw err;
    }
    const found = await findExistingPayroll(employeeId, month, year);
    if (!found) throw err;
    return hrModel.update(hrTables.payrollRecords, found.id, payload);
  }
}

export function computePayrollFromStructure(
  struct: SalaryStructure,
  validation: Record<string, boolean>,
) {
  const basicSalary = findEarning(struct, /basic/);
  const hra = findEarning(struct, /hra|house/);
  const overtimePay = findEarning(struct, /overtime|ot/);
  const holidayPay = findEarning(struct, /holiday/);
  const incentives = findEarning(struct, /incentive/);
  const bonus = findEarning(struct, /bonus/);
  const grossSalary = Number(struct.grossSalary ?? struct.gross_salary ?? 0);
  const allowances = Math.max(0, grossSalary - basicSalary - hra);
  const pfDeduction = findDeduction(struct, /pf|provident/);
  const esiDeduction = findDeduction(struct, /esi/);
  const ptDeduction = findDeduction(struct, /pt|professional/);
  const tdsDeduction = findDeduction(struct, /tds/);
  const leaveDeduction = findDeduction(struct, /leave/);
  const totalDeductions = Number(
    struct.totalDeductions ?? struct.total_deductions ?? 0,
  );
  const otherDeductions = Math.max(
    0,
    totalDeductions - pfDeduction - esiDeduction - ptDeduction - tdsDeduction - leaveDeduction,
  );
  const netSalary = Number(struct.netSalary ?? struct.net_salary ?? grossSalary - totalDeductions);
  const otherEarnings = Math.max(
    0,
    grossSalary - basicSalary - hra - allowances - overtimePay - holidayPay,
  );

  return {
    grossSalary,
    earningsTotal: grossSalary,
    deductionsTotal: totalDeductions,
    netSalary,
    status: "Calculated" as const,
    earningsBreakdown: {
      basicSalary,
      hra,
      allowances,
      overtimePay,
      holidayPay,
      incentives,
      bonus,
      otherEarnings,
    },
    deductionsBreakdown: {
      leaveDeduction,
      pfDeduction,
      esiDeduction,
      ptDeduction,
      tdsDeduction,
      otherDeductions,
    },
    validationFlags: validation,
  };
}

export async function calculatePayrollForPeriod(options: {
  month: number;
  year: number;
  employeeIds?: string[];
}) {
  const { month, year, employeeIds } = options;
  const now = new Date().toISOString();
  const batchId = buildBatchId(month, year);

  const [employeeRows, structureRows] = await Promise.all([
    hrModel.list<Record<string, unknown>>(hrTables.employees),
    hrModel.list<SalaryStructure>(hrTables.salaryStructures),
  ]);

  const structureMap = new Map(structureRows.map((s) => [s.id, s]));
  let employees = employeeRows.filter(
    (e) => !e.status || String(e.status).toLowerCase() === "active",
  );

  if (employeeIds?.length) {
    const idSet = new Set(employeeIds);
    employees = employees.filter((e) => idSet.has(String(e.id)));
  }

  const results: { id: string; employeeId: string; status: string; skipped?: string }[] = [];
  let calculatedCount = 0;
  let skippedCount = 0;

  for (const empRow of employees) {
    const enriched = await enrichEmployee(empRow);
    const employeeId = String(enriched.id);
    const salaryStructureId = String(
      enriched.salaryStructureId ?? enriched.salary_structure_id ?? "",
    );
    const struct = salaryStructureId ? structureMap.get(salaryStructureId) : undefined;

    const revision = await resolveRevisionForPayPeriod(employeeId, month, year).catch(
      () => null,
    );
    const revisionSnapshot = revision ? snapshotFromRevision(revision) : null;

    const validation = {
      missingBankDetails: !(empRow.bankAccount ?? empRow.bank_account),
      missingPan: !(empRow.panNumber ?? empRow.pan_number),
      missingSalaryStructure: !struct && !revisionSnapshot,
      missingCompensationRevision: !revisionSnapshot,
      hasAttendanceIssue: false,
      pendingLeaveApproval: false,
      pendingOtApproval: false,
    };

    const existing = await findExistingPayroll(employeeId, month, year);
    if (existing && (existing.isLocked || NON_RECALCULABLE.has(existing.status))) {
      results.push({
        id: existing.id,
        employeeId,
        status: existing.status,
        skipped: "Payroll is approved or locked — unlock before recalculating",
      });
      skippedCount += 1;
      continue;
    }

    const basePayload = {
      employeeId,
      payrollMonth: month,
      payrollYear: year,
      payrollBatchId: batchId,
      updatedAt: now,
    };

    const bonusExtra = await sumApprovedBonusesForPeriod(employeeId, month, year).catch(() => 0);

    if (revisionSnapshot) {
      const computed = payrollPayloadFromSnapshot(
        revisionSnapshot,
        {
          ...validation,
          missingSalaryStructure: false,
          missingCompensationRevision: false,
        },
        bonusExtra,
      );

      const payload = {
        ...basePayload,
        ...computed,
        calculatedAt: now,
      };

      const saved = await upsertPayrollRecord(existing, payload, employeeId, month, year);
      results.push({
        id: (saved as { id: string }).id,
        employeeId,
        status: "Calculated",
      });
      calculatedCount += 1;
      continue;
    }

    if (!struct) {
      const draftPayload = {
        ...basePayload,
        grossSalary: 0,
        earningsTotal: 0,
        deductionsTotal: 0,
        netSalary: 0,
        status: "Draft",
        earningsBreakdown: {},
        deductionsBreakdown: {},
        validationFlags: validation,
      };

      const saved = await upsertPayrollRecord(existing, draftPayload, employeeId, month, year);
      results.push({
        id: (saved as { id: string }).id,
        employeeId,
        status: "Draft",
      });
      skippedCount += 1;
      continue;
    }

    const computed = computePayrollFromStructure(struct, {
      ...validation,
      missingSalaryStructure: false,
      missingCompensationRevision: true,
    });

    if (bonusExtra > 0) {
      computed.earningsBreakdown.bonus =
        Number(computed.earningsBreakdown.bonus ?? 0) + bonusExtra;
      computed.grossSalary += bonusExtra;
      computed.earningsTotal += bonusExtra;
      computed.netSalary += bonusExtra;
    }

    const payload = {
      ...basePayload,
      ...computed,
      calculatedAt: now,
    };

    const saved = await upsertPayrollRecord(existing, payload, employeeId, month, year);
    results.push({
      id: (saved as { id: string }).id,
      employeeId,
      status: "Calculated",
    });
    calculatedCount += 1;
  }

  return {
    month,
    year,
    monthLabel: `${MONTH_NAMES[month] ?? month} ${year}`,
    batchId,
    calculatedCount,
    skippedCount,
    totalEmployees: employees.length,
    results,
  };
}

export function monthLabel(month: number, year: number) {
  return `${MONTH_NAMES[month] ?? month} ${year}`;
}
