import { listRows, getRowById } from "../../models/base.js";
import { hrTables } from "../../models/human-resources/index.js";
import { supabase } from "../../utils/supabase.js";
import { toCamel } from "../../utils/mappers.js";
import { enrichEmployee } from "../human-resources/enrich.js";
import type { EmployeeContext } from "../../types/auth.js";

export type EmployeeRow = Record<string, unknown> & {
  id: string;
  email?: string;
  empCode?: string;
  firstName?: string;
  lastName?: string;
  leaveBalance?: { casual?: number; sick?: number; earned?: number };
};

function parseLeaveBalance(raw: unknown): { casual?: number; sick?: number; earned?: number } {
  if (typeof raw === "object" && raw !== null) {
    return raw as { casual?: number; sick?: number; earned?: number };
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as { casual?: number; sick?: number; earned?: number };
    } catch {
      return {};
    }
  }
  return {};
}

export async function findEmployeeByEmail(email: string): Promise<EmployeeRow | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await supabase
    .from(hrTables.employees)
    .select("*")
    .ilike("email", normalized)
    .eq("status", "Active")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return toCamel<EmployeeRow>(data);
}

export async function getEmployeeById(id: string): Promise<EmployeeRow | null> {
  const row = await getRowById<EmployeeRow>(hrTables.employees, id);
  return row;
}

export async function buildEmployeeContext(employee: EmployeeRow): Promise<EmployeeContext> {
  const enriched = await enrichEmployee(employee);

  return {
    employeeId: String(employee.id),
    empCode: String(enriched.empCode ?? employee.empCode ?? ""),
    firstName: String(enriched.firstName ?? employee.firstName ?? ""),
    lastName: String(enriched.lastName ?? employee.lastName ?? ""),
    department: enriched.department as string | undefined,
    designation: enriched.designation as string | undefined,
    leaveBalance: parseLeaveBalance(enriched.leaveBalance ?? employee.leaveBalance),
  };
}

export async function buildEmployeeProfile(employee: EmployeeRow) {
  const enriched = await enrichEmployee(employee);
  const [employmentType, shiftType] = await Promise.all([
    enriched.employmentTypeId
      ? getRowById(hrTables.employmentTypes, String(enriched.employmentTypeId)).catch(() => null)
      : Promise.resolve(null),
    enriched.shiftTypeId
      ? getRowById(hrTables.shiftTypes, String(enriched.shiftTypeId)).catch(() => null)
      : Promise.resolve(null),
  ]);

  const leaveBalance = parseLeaveBalance(enriched.leaveBalance);

  return {
    id: String(enriched.id),
    name: `${enriched.firstName ?? ""} ${enriched.lastName ?? ""}`.trim(),
    empCode: enriched.empCode,
    email: enriched.email,
    phone: enriched.phone,
    gender: enriched.gender,
    dob: enriched.dob,
    bloodGroup: enriched.bloodGroup,
    address: enriched.address,
    avatar: enriched.avatar ?? enriched.photoUrl,
    status: enriched.status,
    department: enriched.department,
    designation: enriched.designation,
    employmentType:
      (employmentType as Record<string, unknown> | null)?.typeName ??
      (employmentType as Record<string, unknown> | null)?.type_name,
    shiftType:
      (shiftType as Record<string, unknown> | null)?.shiftName ??
      (shiftType as Record<string, unknown> | null)?.shift_name,
    joinDate: enriched.joinDate,
    reportingManager: enriched.reportingManager,
    emergencyContact: enriched.emergencyContact,
    bankName: enriched.bankName,
    bankAccount: enriched.bankAccount,
    ifscCode: enriched.ifscCode,
    panNumber: enriched.panNumber,
    uanNumber: enriched.uanNumber,
    esicNumber: enriched.esicNumber,
    leaveBalance,
  };
}

export function mapPortalAttendanceRow(row: Record<string, unknown>) {
  const recordDate = String(row.recordDate ?? row.record_date ?? "").slice(0, 10);
  const checkIn = row.checkIn ?? row.check_in;
  const checkOut = row.checkOut ?? row.check_out;
  const status = String(row.status ?? "Present");

  return {
    attendanceDate: recordDate,
    attendanceStatus: status.toUpperCase().replace(/\s+/g, "_"),
    dayType: inferDayType(status),
    punchIn: toPunchIso(recordDate, checkIn),
    punchOut: toPunchIso(recordDate, checkOut),
    workedHours: Number(row.workedHours ?? row.worked_hours ?? 0),
    shiftName: row.shiftName ?? row.shift_name,
    remarks: row.manualReason ?? row.manual_reason,
  };
}

function inferDayType(status: string): string {
  const s = status.toUpperCase();
  if (s.includes("LEAVE")) return "LEAVE";
  if (s.includes("HOLIDAY")) return "HOLIDAY";
  if (s.includes("WEEKLY")) return "WEEKLY_OFF";
  return "WORKING";
}

function toPunchIso(date: string, value: unknown): string | undefined {
  if (!value || value === "-") return undefined;
  const raw = String(value);
  if (raw.includes("T")) return raw;
  if (!date) return raw;
  const match = raw.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return `${date}T${raw}`;
  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return `${date}T${String(hours).padStart(2, "0")}:${minutes}:00`;
}

export async function listEmployeeAttendance(employeeId: string) {
  const rows = await listRows<Record<string, unknown>>(hrTables.attendanceRecords, {
    filters: { employee_id: employeeId },
    orderBy: "record_date",
  });
  return rows.map(mapPortalAttendanceRow);
}

export async function getTodayAttendance(employeeId: string) {
  const today = new Date().toLocaleDateString("en-CA");
  const rows = await listRows<Record<string, unknown>>(hrTables.attendanceRecords, {
    filters: { employee_id: employeeId, record_date: today },
  });
  if (!rows.length) return null;
  return mapPortalAttendanceRow(rows[0]);
}
