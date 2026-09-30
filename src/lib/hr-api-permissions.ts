import type { PermissionLevel } from "../types/platform.js";

export type PermissionMap = Record<string, PermissionLevel | "admin">;

type ApiPermissionRule = {
  pattern: RegExp;
  readKeys: string[];
  writeKeys: string[];
};

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Maps HR API paths (relative to /api/human-resources) to module keys. */
const HR_API_RULES: ApiPermissionRule[] = [
  { pattern: /^\/dashboard\/?$/, readKeys: ["hr_dashboard"], writeKeys: ["hr_dashboard"] },
  {
    pattern: /^\/employees\/?$/,
    readKeys: ["hr_employees"],
    writeKeys: ["hr_employees_add", "hr_employees"],
  },
  {
    pattern: /^\/employees\/[^/]+\/?$/,
    readKeys: ["hr_employees", "hr_employees_profile"],
    writeKeys: ["hr_employees_profile", "hr_employees"],
  },
  {
    pattern: /^\/compensation(\/|$)/,
    readKeys: ["hr_salary_structure", "hr_process_payroll"],
    writeKeys: ["hr_salary_structure", "hr_process_payroll"],
  },
  {
    pattern: /^\/employees\/[^/]+\/compensation(\/|$)/,
    readKeys: ["hr_salary_structure", "hr_employees_profile"],
    writeKeys: ["hr_salary_structure", "hr_employees_profile"],
  },
  {
    pattern: /^\/employees\/[^/]+\/bonus-awards(\/|$)/,
    readKeys: ["hr_process_payroll", "hr_employees_profile"],
    writeKeys: ["hr_process_payroll", "hr_employees_profile"],
  },
  { pattern: /^\/attendance(\/|$)/, readKeys: ["hr_attendance"], writeKeys: ["hr_attendance"] },
  {
    pattern: /^\/shift-assignments(\/|$)/,
    readKeys: ["hr_shift_management"],
    writeKeys: ["hr_shift_management"],
  },
  {
    pattern: /^\/leave-applications(\/|$)/,
    readKeys: ["hr_leave_management"],
    writeKeys: ["hr_leave_management"],
  },
  { pattern: /^\/overtime(\/|$)/, readKeys: ["hr_overtime"], writeKeys: ["hr_overtime"] },
  { pattern: /^\/weekly-offs(\/|$)/, readKeys: ["hr_weekly_off"], writeKeys: ["hr_weekly_off"] },
  { pattern: /^\/payroll(\/|$)/, readKeys: ["hr_process_payroll", "hr_payroll_settings"], writeKeys: ["hr_process_payroll", "hr_payroll_settings"] },
  { pattern: /^\/payslips(\/|$)/, readKeys: ["hr_payslips"], writeKeys: ["hr_payslips"] },
  {
    pattern: /^\/salary-structures(\/|$)/,
    readKeys: ["hr_salary_structure"],
    writeKeys: ["hr_salary_structure"],
  },
  {
    pattern: /^\/salary-payments(\/|$)/,
    readKeys: ["hr_process_payroll"],
    writeKeys: ["hr_process_payroll"],
  },
  {
    pattern: /^\/complaints(\/|$)/,
    readKeys: ["hr_complaint_list", "hr_raise_complaint"],
    writeKeys: ["hr_complaint_list", "hr_raise_complaint"],
  },
  {
    pattern: /^\/complaint-categories(\/|$)/,
    readKeys: ["hr_complaint_categories"],
    writeKeys: ["hr_complaint_categories"],
  },
  {
    pattern: /^\/approval-workflows(\/|$)/,
    readKeys: ["hr_complaint_status"],
    writeKeys: ["hr_complaint_status"],
  },
  {
    pattern: /^\/masters\/departments(\/|$)/,
    readKeys: ["hr_departments"],
    writeKeys: ["hr_departments"],
  },
  {
    pattern: /^\/masters\/designations(\/|$)/,
    readKeys: ["hr_designations"],
    writeKeys: ["hr_designations"],
  },
  {
    pattern: /^\/masters\/employment-types(\/|$)/,
    readKeys: ["hr_employment_types"],
    writeKeys: ["hr_employment_types"],
  },
  {
    pattern: /^\/masters\/shift-types(\/|$)/,
    readKeys: ["hr_shift_types"],
    writeKeys: ["hr_shift_types"],
  },
  {
    pattern: /^\/masters\/leave-types(\/|$)/,
    readKeys: ["hr_leave_types"],
    writeKeys: ["hr_leave_types"],
  },
  {
    pattern: /^\/masters\/leave-policies(\/|$)/,
    readKeys: ["hr_leave_policies"],
    writeKeys: ["hr_leave_policies"],
  },
  {
    pattern: /^\/masters\/holidays(\/|$)/,
    readKeys: ["hr_holiday_calendar"],
    writeKeys: ["hr_holiday_calendar"],
  },
  {
    pattern: /^\/masters\/salary-components(\/|$)/,
    readKeys: ["hr_salary_components"],
    writeKeys: ["hr_salary_components"],
  },
  {
    pattern: /^\/masters\/document-categories(\/|$)/,
    readKeys: ["hr_document_masters"],
    writeKeys: ["hr_document_masters"],
  },
  {
    pattern: /^\/masters\/document-types(\/|$)/,
    readKeys: ["hr_document_masters"],
    writeKeys: ["hr_document_masters"],
  },
];

export function hasModulePermission(
  permissions: PermissionMap,
  moduleKey: string,
  level: "read" | "write",
): boolean {
  const granted = permissions[moduleKey];
  if (!granted) return false;
  if (level === "read") return granted === "read" || granted === "write" || granted === "admin";
  return granted === "write" || granted === "admin";
}

function hasAnyPermission(
  permissions: PermissionMap,
  moduleKeys: string[],
  level: "read" | "write",
): boolean {
  return moduleKeys.some((key) => hasModulePermission(permissions, key, level));
}

export function resolveHrApiPermission(
  method: string,
  path: string,
): { level: "read" | "write"; moduleKeys: string[] } | null {
  const normalizedPath = path.split("?")[0] || "/";
  for (const rule of HR_API_RULES) {
    if (!rule.pattern.test(normalizedPath)) continue;
    const level = WRITE_METHODS.has(method.toUpperCase()) ? "write" : "read";
    return {
      level,
      moduleKeys: level === "write" ? rule.writeKeys : rule.readKeys,
    };
  }
  return null;
}

export function isHrApiAllowed(
  method: string,
  path: string,
  permissions: PermissionMap,
): boolean {
  const resolved = resolveHrApiPermission(method, path);
  if (!resolved) return false;
  return hasAnyPermission(permissions, resolved.moduleKeys, resolved.level);
}

export function isPlatformUsersApiAllowed(
  method: string,
  permissions: PermissionMap,
): boolean {
  const level = WRITE_METHODS.has(method.toUpperCase()) ? "write" : "read";
  return hasModulePermission(permissions, "hr_user_management", level);
}
