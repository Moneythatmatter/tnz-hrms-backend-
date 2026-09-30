import { hrModel, hrTables } from "../../models/human-resources/index.js";

type Dept = { id: string; departmentName: string };
type Desig = { id: string; designationTitle: string };
type EmpType = { id: string; typeName: string };
type Shift = { id: string; shiftName: string };
type SalaryStructure = {
  id: string;
  name: string;
  grossSalary?: number;
  gross_salary?: number;
  netSalary?: number;
  net_salary?: number;
};
type Employee = {
  id: string;
  empCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  designationId?: string;
  employmentTypeId?: string;
  shiftTypeId?: string;
  joinDate?: string;
  salary?: number;
  status: string;
  gender?: string;
  avatar?: string;
  photoUrl?: string;
  attendanceRate?: number;
  leaveBalance?: { casual?: number; sick?: number; earned?: number };
  [key: string]: unknown;
};

type LookupCaches = {
  departments: Map<string, string>;
  designations: Map<string, string>;
  employmentTypes: Map<string, string>;
  shiftTypes: Map<string, string>;
};

let lookupCache: LookupCaches | null = null;

async function loadLookups(force = false): Promise<LookupCaches> {
  if (!force && lookupCache) {
    return lookupCache;
  }

  const [depts, desigs, empTypes, shifts] = await Promise.all([
    hrModel.list<Dept>(hrTables.departments).catch(() => []),
    hrModel.list<Desig>(hrTables.designations).catch(() => []),
    hrModel.list<EmpType>(hrTables.employmentTypes).catch(() => []),
    hrModel.list<Shift>(hrTables.shiftTypes).catch(() => []),
  ]);

  const caches: LookupCaches = {
    departments: new Map(
      (depts || []).map((d: any) => [
        d.id,
        String(d.departmentName || d.name || d.department_name || d.dept_name || "").trim(),
      ])
    ),
    designations: new Map(
      (desigs || []).map((d: any) => [
        d.id,
        String(d.designationTitle || d.designationName || d.designation_title || d.designation_name || d.title || d.name || "").trim(),
      ])
    ),
    employmentTypes: new Map(
      (empTypes || []).map((d: any) => [
        d.id,
        String(d.typeName || d.type_name || d.name || d.workingTerm || d.title || "").trim(),
      ])
    ),
    shiftTypes: new Map(
      (shifts || []).map((d: any) => [
        d.id,
        String(d.shiftName || d.shift_name || d.name || d.title || "").trim(),
      ])
    ),
  };

  lookupCache = caches;
  return caches;
}

export function clearHrLookupCache() {
  lookupCache = null;
}

export async function enrichEmployee(emp: any) {
  if (!emp) return emp;
  const caches = await loadLookups();

  const resolve = (id: string | undefined, map: Map<string, string>) => {
    if (!id) return "";
    return map.get(id) ?? "";
  };

  const deptId = emp.departmentId || emp.department_id;
  const desigId = emp.designationId || emp.designation_id;
  const empTypeId = emp.employmentTypeId || emp.employment_type_id;
  const shiftId = emp.shiftTypeId || emp.shift_type_id;

  let department = resolve(deptId, caches.departments) || emp.department || "";
  let designation = resolve(desigId, caches.designations) || emp.designation || "";
  let employmentType = resolve(empTypeId, caches.employmentTypes) || emp.employmentType || emp.employment_type || "";
  let shiftType = resolve(shiftId, caches.shiftTypes) || emp.shiftType || emp.shift_type || "";

  const firstName = emp.firstName || emp.first_name || "";
  const lastName = emp.lastName || emp.last_name || "";
  const name = `${firstName} ${lastName}`.trim() || emp.name || emp.empCode || emp.emp_code || "Employee";
  const salaryStructureId = emp.salaryStructureId || emp.salary_structure_id || "";

  return {
    ...emp,
    name,
    department,
    designation,
    employmentType,
    shiftType,
    salaryStructureId: salaryStructureId ? String(salaryStructureId) : "",
  };
}

function attachSalaryStructureFields(emp: Record<string, unknown>, structure?: SalaryStructure | null) {
  const salaryStructureId = emp.salaryStructureId || emp.salary_structure_id;
  if (!salaryStructureId) {
    return { ...emp, salaryStructureId: "", salaryStructureName: "", structureGrossSalary: 0, structureNetSalary: 0 };
  }
  if (!structure) {
    return { ...emp, salaryStructureId: String(salaryStructureId) };
  }
  return {
    ...emp,
    salaryStructureId: String(salaryStructureId),
    salaryStructureName: String(structure.name ?? ""),
    structureGrossSalary: Number(structure.grossSalary ?? structure.gross_salary ?? 0),
    structureNetSalary: Number(structure.netSalary ?? structure.net_salary ?? 0),
  };
}

export async function enrichEmployees(rows: any[]) {
  if (!Array.isArray(rows)) return [];
  await loadLookups();
  const structures = await hrModel.list<SalaryStructure>(hrTables.salaryStructures).catch(() => []);
  const structureMap = new Map(structures.map((s) => [s.id, s]));

  return Promise.all(
    rows.map(async (row) => {
      const enriched = await enrichEmployee(row);
      const structureId = enriched.salaryStructureId || enriched.salary_structure_id;
      return attachSalaryStructureFields(
        enriched,
        structureId ? structureMap.get(String(structureId)) : undefined,
      );
    }),
  );
}

type PayrollRow = {
  id: string;
  employeeId: string;
  payrollMonth: number;
  payrollYear: number;
  payrollBatchId?: string;
  grossSalary: number;
  earningsTotal: number;
  deductionsTotal: number;
  netSalary: number;
  status: string;
  calculatedAt?: string;
  verifiedAt?: string;
  approvedAt?: string;
  isLocked?: boolean;
  earningsBreakdown?: Record<string, number>;
  deductionsBreakdown?: Record<string, number>;
  validationFlags?: Record<string, boolean>;
  payslipGenerated?: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function enrichPayrollRecord(row: PayrollRow) {
  const emp = await hrModel.get<Employee>(hrTables.employees, row.employeeId);
  const enriched = emp ? await enrichEmployee(emp) : null;
  const earnings = row.earningsBreakdown ?? {};
  const deductions = row.deductionsBreakdown ?? {};
  return {
    ...row,
    payrollId: row.payrollBatchId ?? `PAY-${row.payrollYear}-${String(row.payrollMonth).padStart(2, "0")}`,
    employeeName: enriched?.name ?? "",
    empCode: enriched?.empCode ?? enriched?.emp_code ?? "",
    department: enriched?.department ?? "",
    designation: enriched?.designation ?? "",
    employmentType: enriched?.employmentType ?? enriched?.employment_type ?? "",
    avatar: enriched?.avatar ?? "",
    photoUrl: enriched?.photoUrl,
    basicSalary: earnings.basicSalary ?? 0,
    hra: earnings.hra ?? 0,
    allowances: earnings.allowances ?? 0,
    overtimePay: earnings.overtimePay ?? 0,
    holidayPay: earnings.holidayPay ?? 0,
    incentives: earnings.incentives ?? 0,
    bonus: earnings.bonus ?? 0,
    otherEarnings: earnings.otherEarnings ?? 0,
    leaveDeduction: deductions.leaveDeduction ?? 0,
    pfDeduction: deductions.pfDeduction ?? 0,
    esiDeduction: deductions.esiDeduction ?? 0,
    ptDeduction: deductions.ptDeduction ?? 0,
    tdsDeduction: deductions.tdsDeduction ?? 0,
    otherDeductions: deductions.otherDeductions ?? 0,
    hasAttendanceIssue: row.validationFlags?.hasAttendanceIssue,
    missingBankDetails: row.validationFlags?.missingBankDetails,
    missingSalaryStructure: row.validationFlags?.missingSalaryStructure,
    missingPan: row.validationFlags?.missingPan,
    pendingLeaveApproval: row.validationFlags?.pendingLeaveApproval,
    pendingOtApproval: row.validationFlags?.pendingOtApproval,
  };
}

export async function enrichPayrollRecords(rows: PayrollRow[]) {
  return Promise.all(rows.map((r) => enrichPayrollRecord(r)));
}

export function splitEmployeePayload(body: Record<string, unknown>) {
  const earningsBreakdown = {
    basicSalary: body.basicSalary,
    hra: body.hra,
    allowances: body.allowances,
    overtimePay: body.overtimePay,
    holidayPay: body.holidayPay,
    incentives: body.incentives,
    bonus: body.bonus,
    otherEarnings: body.otherEarnings,
  };
  const deductionsBreakdown = {
    leaveDeduction: body.leaveDeduction,
    pfDeduction: body.pfDeduction,
    esiDeduction: body.esiDeduction,
    ptDeduction: body.ptDeduction,
    tdsDeduction: body.tdsDeduction,
    otherDeductions: body.otherDeductions,
  };
  const validationFlags = {
    hasAttendanceIssue: body.hasAttendanceIssue,
    missingBankDetails: body.missingBankDetails,
    missingSalaryStructure: body.missingSalaryStructure,
    missingPan: body.missingPan,
    pendingLeaveApproval: body.pendingLeaveApproval,
    pendingOtApproval: body.pendingOtApproval,
  };
  return { earningsBreakdown, deductionsBreakdown, validationFlags };
}

export function mapPayrollIncoming(body: Record<string, unknown>, isCreate: boolean) {
  const next = { ...body };
  const { earningsBreakdown, deductionsBreakdown, validationFlags } = splitEmployeePayload(body);
  if (Object.values(earningsBreakdown).some((v) => v !== undefined)) {
    next.earningsBreakdown = earningsBreakdown;
  }
  if (Object.values(deductionsBreakdown).some((v) => v !== undefined)) {
    next.deductionsBreakdown = deductionsBreakdown;
  }
  if (Object.values(validationFlags).some((v) => v !== undefined)) {
    next.validationFlags = validationFlags;
  }
  [
    "basicSalary", "hra", "allowances", "overtimePay", "holidayPay", "incentives", "bonus", "otherEarnings",
    "leaveDeduction", "pfDeduction", "esiDeduction", "ptDeduction", "tdsDeduction", "otherDeductions",
    "hasAttendanceIssue", "missingBankDetails", "missingSalaryStructure", "missingPan",
    "pendingLeaveApproval", "pendingOtApproval", "employeeName", "department", "designation", "avatar", "photoUrl", "payrollId",
  ].forEach((k) => delete next[k]);
  if (isCreate && !next.status) next.status = "Draft";
  return next;
}
