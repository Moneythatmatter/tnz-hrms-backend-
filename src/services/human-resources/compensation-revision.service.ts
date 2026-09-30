import { hrModel, hrTables } from "../../models/human-resources/index.js";
import { newId } from "../../models/base.js";
import {
  buildComponentSnapshotFromStructure,
  type ComponentSnapshot,
} from "./compensation-snapshot.service.js";
import { enrichEmployee } from "./enrich.js";

export type CompensationRevisionRow = {
  id: string;
  employeeId: string;
  salaryStructureId?: string;
  revisionType: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  oldGross?: number;
  newGross: number;
  hikePercentage?: number | null;
  reason?: string;
  remarks?: string;
  status: string;
  oldComponents?: ComponentSnapshot | Record<string, unknown> | null;
  newComponents?: ComponentSnapshot | Record<string, unknown> | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdBy?: string | null;
  createdAt?: string;
};

function parseDateOnly(value: string): Date {
  const raw = value.slice(0, 10);
  const [y, m, d] = raw.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDaysIso(isoDate: string, days: number): string {
  const dt = parseDateOnly(isoDate);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function payPeriodBounds(month: number, year: number) {
  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const periodEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { periodStart, periodEnd };
}

export async function listRevisionsForEmployee(employeeId: string) {
  const rows = await hrModel.list<CompensationRevisionRow>(hrTables.compensationRevisions, {
    filters: { employee_id: employeeId },
    orderBy: "effective_from",
    ascending: false,
  });
  return rows;
}

/** Active approved revision (no effective_to), latest effective_from wins. */
export async function getCurrentApprovedRevision(employeeId: string) {
  const rows = await listRevisionsForEmployee(employeeId);
  const approved = rows.filter((r) => String(r.status).toLowerCase() === "approved");
  const open = approved.filter((r) => !r.effectiveTo);
  const pool = open.length > 0 ? open : approved;
  if (pool.length === 0) return null;
  return pool.sort((a, b) =>
    String(b.effectiveFrom ?? "").localeCompare(String(a.effectiveFrom ?? "")),
  )[0];
}

export async function getLatestApprovedRevision(employeeId: string) {
  return getCurrentApprovedRevision(employeeId);
}

/**
 * Active approved revision for a payroll month (effective_from <= period end; effective_to open or >= period start).
 */
export async function resolveRevisionForPayPeriod(
  employeeId: string,
  month: number,
  year: number,
): Promise<CompensationRevisionRow | null> {
  const { periodStart, periodEnd } = payPeriodBounds(month, year);
  const rows = await hrModel.list<CompensationRevisionRow>(hrTables.compensationRevisions, {
    filters: { employee_id: employeeId },
    orderBy: "effective_from",
    ascending: true,
  });

  const approved = rows.filter((r) => String(r.status).toLowerCase() === "approved");
  let match: CompensationRevisionRow | null = null;
  for (const row of approved) {
    const from = String(row.effectiveFrom ?? "").slice(0, 10);
    const to = row.effectiveTo ? String(row.effectiveTo).slice(0, 10) : null;
    if (from <= periodEnd && (!to || to >= periodStart)) {
      match = row;
    }
  }
  return match;
}

export function snapshotFromRevision(row: CompensationRevisionRow): ComponentSnapshot | null {
  const raw = row.newComponents;
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as ComponentSnapshot;
  if (typeof snap.gross !== "number") return null;
  return snap;
}

export async function ensureInitialRevision(employeeId: string, createdBy?: string) {
  const existing = await getLatestApprovedRevision(employeeId);
  if (existing) return existing;

  const emp = await hrModel.get<Record<string, unknown>>(hrTables.employees, employeeId);
  if (!emp) throw new Error("Employee not found");

  const structureId = String(emp.salaryStructureId ?? emp.salary_structure_id ?? "").trim();
  const joinDate = String(emp.joinDate ?? emp.join_date ?? new Date().toISOString()).slice(0, 10);
  const fallbackGross = Number(emp.salary ?? 0);

  let snapshot: ComponentSnapshot;
  if (structureId) {
    const struct = await hrModel.get<Record<string, unknown>>(hrTables.salaryStructures, structureId);
    if (struct) {
      const templateGross = Number(struct.grossSalary ?? struct.gross_salary ?? 0);
      const target = fallbackGross > 0 ? fallbackGross : templateGross;
      snapshot = buildComponentSnapshotFromStructure(
        {
          grossSalary: templateGross,
          earnings: (struct.earnings as never[]) ?? [],
          deductions: (struct.deductions as never[]) ?? [],
        },
        target > 0 ? target : templateGross,
      );
    } else {
      snapshot = buildComponentSnapshotFromStructure({ earnings: [] }, fallbackGross || 0);
    }
  } else {
    snapshot = buildComponentSnapshotFromStructure({ earnings: [] }, fallbackGross || 0);
  }

  const now = new Date().toISOString();
  const row = await hrModel.create(hrTables.compensationRevisions, {
    id: newId(),
    employeeId,
    salaryStructureId: structureId || null,
    revisionType: "initial",
    effectiveFrom: joinDate,
    effectiveTo: null,
    oldGross: null,
    newGross: snapshot.gross,
    hikePercentage: null,
    reason: "Initial salary",
    remarks: "Auto-created from employee record",
    status: "Approved",
    oldComponents: null,
    newComponents: snapshot,
    approvedBy: createdBy ?? "System",
    approvedAt: now,
    createdBy: createdBy ?? "System",
    createdAt: now,
    updatedAt: now,
  });

  if (snapshot.gross > 0) {
    await hrModel.update(hrTables.employees, employeeId, {
      salary: snapshot.gross,
      updatedAt: now,
    });
  }

  return row as CompensationRevisionRow;
}

export type PreviewIncrementInput = {
  incrementType: "percentage" | "fixed" | "new_gross";
  incrementValue: number;
  effectiveFrom?: string;
};

export function computeNewGrossFromIncrement(
  currentGross: number,
  input: PreviewIncrementInput,
): { newGross: number; hikePercentage: number | null } {
  const current = Math.max(0, currentGross);
  let newGross = current;
  let hikePercentage: number | null = null;

  if (input.incrementType === "percentage") {
    hikePercentage = input.incrementValue;
    newGross = Math.round(current * (1 + input.incrementValue / 100));
  } else if (input.incrementType === "fixed") {
    newGross = Math.round(current + input.incrementValue);
    hikePercentage = current > 0 ? Math.round(((newGross - current) / current) * 10000) / 100 : null;
  } else {
    newGross = Math.round(input.incrementValue);
    hikePercentage = current > 0 ? Math.round(((newGross - current) / current) * 10000) / 100 : null;
  }

  return { newGross: Math.max(0, newGross), hikePercentage };
}

export async function previewIncrement(
  employeeId: string,
  input: PreviewIncrementInput,
) {
  const latest = await getLatestApprovedRevision(employeeId);
  const currentGross = Number(latest?.newGross ?? 0);
  const emp = await hrModel.get<Record<string, unknown>>(hrTables.employees, employeeId);
  const structureId = String(
    emp?.salaryStructureId ?? emp?.salary_structure_id ?? latest?.salaryStructureId ?? "",
  ).trim();

  const { newGross, hikePercentage } = computeNewGrossFromIncrement(
    currentGross || Number(emp?.salary ?? 0),
    input,
  );

  let snapshot: ComponentSnapshot;
  if (structureId) {
    const struct = await hrModel.get<Record<string, unknown>>(hrTables.salaryStructures, structureId);
    if (struct) {
      snapshot = buildComponentSnapshotFromStructure(
        {
          grossSalary: Number(struct.grossSalary ?? struct.gross_salary ?? 0),
          earnings: (struct.earnings as never[]) ?? [],
          deductions: (struct.deductions as never[]) ?? [],
        },
        newGross,
      );
    } else {
      snapshot = buildComponentSnapshotFromStructure({ earnings: [] }, newGross);
    }
  } else {
    snapshot = buildComponentSnapshotFromStructure({ earnings: [] }, newGross);
  }

  return {
    currentGross: currentGross || Number(emp?.salary ?? 0),
    newGross,
    hikePercentage,
    salaryStructureId: structureId || null,
    componentPreview: snapshot,
  };
}

export async function submitRevision(
  employeeId: string,
  body: {
    revisionType?: string;
    incrementType: "percentage" | "fixed" | "new_gross";
    incrementValue: number;
    effectiveFrom: string;
    reason?: string;
    remarks?: string;
    createdBy?: string;
    autoApprove?: boolean;
  },
) {
  const preview = await previewIncrement(employeeId, {
    incrementType: body.incrementType,
    incrementValue: body.incrementValue,
    effectiveFrom: body.effectiveFrom,
  });

  const latest = await getLatestApprovedRevision(employeeId);
  const oldGross = preview.currentGross;
  const oldSnapshot = latest ? snapshotFromRevision(latest) : null;

  const emp = await hrModel.get<Record<string, unknown>>(hrTables.employees, employeeId);
  const structureId = String(
    emp?.salaryStructureId ?? emp?.salary_structure_id ?? preview.salaryStructureId ?? "",
  ).trim();

  const now = new Date().toISOString();
  const status = body.autoApprove ? "Approved" : "Pending";

  const row = (await hrModel.create(hrTables.compensationRevisions, {
    id: newId(),
    employeeId,
    salaryStructureId: structureId || null,
    revisionType: body.revisionType ?? "increment",
    effectiveFrom: body.effectiveFrom.slice(0, 10),
    effectiveTo: null,
    oldGross,
    newGross: preview.newGross,
    hikePercentage: preview.hikePercentage,
    reason: body.reason ?? "",
    remarks: body.remarks ?? "",
    status,
    oldComponents: oldSnapshot,
    newComponents: preview.componentPreview,
    approvedBy: body.autoApprove ? body.createdBy ?? "HR" : null,
    approvedAt: body.autoApprove ? now : null,
    createdBy: body.createdBy ?? "HR",
    createdAt: now,
    updatedAt: now,
  })) as CompensationRevisionRow;

  if (body.autoApprove) {
    await closePriorRevisionsOnApprove(employeeId, body.effectiveFrom.slice(0, 10), row.id);
    await hrModel.update(hrTables.employees, employeeId, {
      salary: preview.newGross,
      updatedAt: now,
    });
  }

  return row;
}

async function closePriorRevisionsOnApprove(
  employeeId: string,
  effectiveFrom: string,
  approvedId: string,
) {
  const closeTo = addDaysIso(effectiveFrom, -1);
  const rows = await hrModel.list<CompensationRevisionRow>(hrTables.compensationRevisions, {
    filters: { employee_id: employeeId },
  });
  const now = new Date().toISOString();

  for (const row of rows) {
    if (row.id === approvedId) continue;
    if (String(row.status).toLowerCase() !== "approved") continue;
    if (row.effectiveTo) continue;
    const from = String(row.effectiveFrom).slice(0, 10);
    if (from >= effectiveFrom) continue;
    await hrModel.update(hrTables.compensationRevisions, row.id, {
      effectiveTo: closeTo,
      updatedAt: now,
    });
  }
}

export async function approveRevision(revisionId: string, approvedBy: string) {
  const row = await hrModel.get<CompensationRevisionRow>(hrTables.compensationRevisions, revisionId);
  if (!row) throw new Error("Compensation revision not found");
  if (String(row.status).toLowerCase() === "approved") return row;

  const now = new Date().toISOString();
  const effectiveFrom = String(row.effectiveFrom).slice(0, 10);

  await closePriorRevisionsOnApprove(row.employeeId, effectiveFrom, revisionId);

  const updated = await hrModel.update(hrTables.compensationRevisions, revisionId, {
    status: "Approved",
    approvedBy,
    approvedAt: now,
    updatedAt: now,
  });

  await hrModel.update(hrTables.employees, row.employeeId, {
    salary: row.newGross,
    updatedAt: now,
  });

  return updated;
}

export async function getCompensationSummary(employeeId: string) {
  await ensureInitialRevision(employeeId).catch(() => null);
  const emp = await hrModel.get<Record<string, unknown>>(hrTables.employees, employeeId);
  const latest = await getCurrentApprovedRevision(employeeId);
  const history = await listRevisionsForEmployee(employeeId);

  let structureName = "";
  const structureId = String(
    emp?.salaryStructureId ?? emp?.salary_structure_id ?? latest?.salaryStructureId ?? "",
  ).trim();
  if (structureId) {
    const struct = await hrModel.get<Record<string, unknown>>(hrTables.salaryStructures, structureId);
    structureName = String(struct?.name ?? "");
  }

  const snapshot = latest ? snapshotFromRevision(latest) : null;

  const effectiveFrom = latest?.effectiveFrom
    ? String(latest.effectiveFrom).slice(0, 10)
    : null;
  const effectiveTo = latest?.effectiveTo
    ? String(latest.effectiveTo).slice(0, 10)
    : null;

  return {
    employeeId,
    salaryStructureId: structureId || null,
    salaryStructureName: structureName,
    currentGross: latest?.newGross ?? Number(emp?.salary ?? 0),
    currentRevision: latest,
    currentEffectiveFrom: effectiveFrom,
    currentEffectiveTo: effectiveTo,
    componentSnapshot: snapshot,
    history,
  };
}

export type EnrichedCompensationRevision = CompensationRevisionRow & {
  employeeName: string;
  empCode: string;
  department: string;
  designation: string;
  salaryStructureName: string;
  periodLabel: string;
};

function formatPeriodLabel(from: string, to?: string | null) {
  const start = from.slice(0, 10);
  if (!to) return `${start} → Present`;
  return `${start} → ${String(to).slice(0, 10)}`;
}

export async function listAllCompensationRevisions(options?: {
  status?: string;
  revisionType?: string;
  department?: string;
  search?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}): Promise<EnrichedCompensationRevision[]> {
  const rows = await hrModel.list<CompensationRevisionRow>(hrTables.compensationRevisions, {
    orderBy: "effective_from",
    ascending: false,
  });

  const structureRows = await hrModel.list<{ id: string; name?: string }>(
    hrTables.salaryStructures,
  );
  const structureMap = new Map(structureRows.map((s) => [s.id, String(s.name ?? "")]));

  const enriched: EnrichedCompensationRevision[] = [];
  for (const row of rows) {
    const emp = await hrModel.get<Record<string, unknown>>(hrTables.employees, row.employeeId);
    if (!emp) continue;
    const empEnriched = await enrichEmployee(emp);
    const structureId = String(
      row.salaryStructureId ?? empEnriched.salaryStructureId ?? "",
    ).trim();

    const item: EnrichedCompensationRevision = {
      ...row,
      employeeName: String(empEnriched.name ?? ""),
      empCode: String(empEnriched.empCode ?? empEnriched.emp_code ?? ""),
      department: String(empEnriched.department ?? ""),
      designation: String(empEnriched.designation ?? ""),
      salaryStructureName: structureId ? structureMap.get(structureId) ?? "" : "",
      periodLabel: formatPeriodLabel(
        String(row.effectiveFrom ?? ""),
        row.effectiveTo ? String(row.effectiveTo) : null,
      ),
    };
    enriched.push(item);
  }

  const q = options?.search?.trim().toLowerCase();
  const statusFilter = options?.status?.trim().toLowerCase();
  const typeFilter = options?.revisionType?.trim().toLowerCase();
  const deptFilter = options?.department?.trim().toLowerCase();
  const fromFilter = options?.effectiveFrom?.slice(0, 10);
  const toFilter = options?.effectiveTo?.slice(0, 10);

  return enriched.filter((row) => {
    if (statusFilter && statusFilter !== "all") {
      if (String(row.status).toLowerCase() !== statusFilter) return false;
    }
    if (typeFilter && typeFilter !== "all") {
      if (String(row.revisionType).toLowerCase() !== typeFilter) return false;
    }
    if (deptFilter && deptFilter !== "all") {
      if (String(row.department).toLowerCase() !== deptFilter.toLowerCase()) return false;
    }
    if (fromFilter) {
      const eff = String(row.effectiveFrom ?? "").slice(0, 10);
      if (eff < fromFilter) return false;
    }
    if (toFilter) {
      const eff = String(row.effectiveFrom ?? "").slice(0, 10);
      if (eff > toFilter) return false;
    }
    if (q) {
      const haystack = [
        row.employeeName,
        row.empCode,
        row.department,
        row.designation,
        row.reason,
        row.remarks,
        row.salaryStructureName,
        row.revisionType,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export async function sumApprovedBonusesForPeriod(
  employeeId: string,
  month: number,
  year: number,
): Promise<number> {
  const rows = await hrModel.list<{
    amount: number;
    status: string;
    payrollMonth: number;
    payrollYear: number;
  }>(hrTables.bonusAwards, {
    filters: {
      employee_id: employeeId,
      payroll_month: month,
      payroll_year: year,
    },
  });
  return rows
    .filter((r) => String(r.status).toLowerCase() === "approved")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);
}
