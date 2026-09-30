export const PLATFORM_MODULES = [
  // General
  { key: "hr_dashboard", label: "Dashboard", group: "General" },
  { key: "hr_reports", label: "Reports", group: "General" },
  { key: "hr_user_management", label: "User Management", group: "General" },

  // Employees
  { key: "hr_employees", label: "Employee List", group: "Employees" },
  { key: "hr_employees_add", label: "Add Employee", group: "Employees" },
  { key: "hr_employees_profile", label: "Employee Profile", group: "Employees" },

  // Attendance & Leave
  { key: "hr_attendance", label: "Attendance", group: "Attendance & Leave" },
  { key: "hr_shift_management", label: "Shift Management", group: "Attendance & Leave" },
  { key: "hr_leave_management", label: "Leave Management", group: "Attendance & Leave" },
  { key: "hr_overtime", label: "Overtime", group: "Attendance & Leave" },
  { key: "hr_weekly_off", label: "Weekly Off", group: "Attendance & Leave" },

  // Payroll
  { key: "hr_process_payroll", label: "Process Payroll", group: "Payroll" },
  { key: "hr_salary_structure", label: "Salary Structure", group: "Payroll" },
  { key: "hr_payslips", label: "Payslips", group: "Payroll" },
  { key: "hr_payroll_settings", label: "Payroll Settings", group: "Payroll" },

  // Grievances
  { key: "hr_raise_complaint", label: "Raise Complaint", group: "Grievances" },
  { key: "hr_complaint_list", label: "Complaint List", group: "Grievances" },
  { key: "hr_complaint_categories", label: "Complaint Categories", group: "Grievances" },
  { key: "hr_complaint_status", label: "Complaint Status", group: "Grievances" },

  // Masters
  { key: "hr_departments", label: "Departments", group: "Masters" },
  { key: "hr_designations", label: "Designations", group: "Masters" },
  { key: "hr_employment_types", label: "Employment Types", group: "Masters" },
  { key: "hr_shift_types", label: "Shift Types", group: "Masters" },
  { key: "hr_leave_types", label: "Leave Types", group: "Masters" },
  { key: "hr_leave_policies", label: "Leave Policies", group: "Masters" },
  { key: "hr_holiday_calendar", label: "Holiday Calendar", group: "Masters" },
  { key: "hr_salary_components", label: "Salary Components", group: "Masters" },
  { key: "hr_document_masters", label: "Document Masters", group: "Masters" },
] as const;

export type ModuleKey = (typeof PLATFORM_MODULES)[number]["key"];
export type PermissionLevel = "read" | "write" | "admin";

export type UserPermissionRow = {
  id: string;
  userId: string;
  moduleKey: string;
  permission: PermissionLevel;
};
