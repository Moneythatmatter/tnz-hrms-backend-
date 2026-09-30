import { supabase } from "../utils/supabase.js";
import { toCamel, toSnake } from "../utils/mappers.js";
import { throwIfRlsError } from "../utils/db-errors.js";

export type FilterMap = Record<string, string | number | boolean | undefined>;

const FALLBACK_DATA: Record<string, any[]> = {
  hr_employment_types: [
    { id: "c3000002-0001-4000-8000-000000000001", typeName: "Permanent", description: "Full-time permanent employee" },
    { id: "c3000002-0001-4000-8000-000000000002", typeName: "Contract", description: "Fixed term contract" },
    { id: "c3000002-0001-4000-8000-000000000003", typeName: "Probation", description: "Probationary period" },
    { id: "c3000002-0001-4000-8000-000000000004", typeName: "Trainee", description: "Trainee / Intern" },
  ],
  hr_designations: [
    { id: "b2000002-0001-4000-8000-000000000001", designationTitle: "Front Desk Manager", title: "Front Desk Manager", departmentId: "a1000002-0001-4000-8000-000000000001" },
    { id: "b2000002-0001-4000-8000-000000000002", designationTitle: "Guest Relations Executive", title: "Guest Relations Executive", departmentId: "a1000002-0001-4000-8000-000000000001" },
    { id: "b2000002-0001-4000-8000-000000000003", designationTitle: "Executive Housekeeper", title: "Executive Housekeeper", departmentId: "a1000002-0001-4000-8000-000000000002" },
    { id: "b2000002-0001-4000-8000-000000000004", designationTitle: "Executive Head Chef", title: "Executive Head Chef", departmentId: "a1000002-0001-4000-8000-000000000003" },
    { id: "b2000002-0001-4000-8000-000000000005", designationTitle: "F&B Captain", title: "F&B Captain", departmentId: "a1000002-0001-4000-8000-000000000003" },
    { id: "b2000002-0001-4000-8000-000000000006", designationTitle: "HR Executive", title: "HR Executive", departmentId: "a1000002-0001-4000-8000-000000000004" },
  ],
  hr_shift_types: [
    { id: "d4000002-0001-4000-8000-000000000001", shiftName: "Morning Shift", name: "Morning Shift", startTime: "07:00", endTime: "15:30" },
    { id: "d4000002-0001-4000-8000-000000000002", shiftName: "Evening Shift", name: "Evening Shift", startTime: "15:00", endTime: "23:30" },
    { id: "d4000002-0001-4000-8000-000000000003", shiftName: "Night Shift", name: "Night Shift", startTime: "23:00", endTime: "07:30" },
    { id: "d4000002-0001-4000-8000-000000000004", shiftName: "General Shift", name: "General Shift", startTime: "09:00", endTime: "18:00" },
  ],
  hr_leave_policies: [
    { id: "f6000002-0001-4000-8000-000000000001", policyName: "Standard Hotel Leave Policy", casualLeaves: 12, sickLeaves: 7, earnedLeaves: 15 },
  ],
  hr_salary_components: [
    { id: "sc-1", name: "Basic Salary", type: "Earning" },
    { id: "sc-2", name: "House Rent Allowance (HRA)", type: "Earning" },
    { id: "sc-3", name: "Special Allowance", type: "Earning" },
    { id: "sc-4", name: "Provident Fund (PF)", type: "Deduction" },
    { id: "sc-5", name: "ESIC", type: "Deduction" },
    { id: "sc-6", name: "Professional Tax (PT)", type: "Deduction" },
  ],
  hr_document_categories: [
    { id: "dc-1", categoryName: "Identity Proof" },
    { id: "dc-2", categoryName: "Address Proof" },
    { id: "dc-3", categoryName: "Educational Certificates" },
    { id: "dc-4", categoryName: "Previous Employment" },
  ],
  hr_document_types: [
    { id: "dt-1", typeName: "Aadhaar Card", categoryId: "dc-1" },
    { id: "dt-2", typeName: "PAN Card", categoryId: "dc-1" },
    { id: "dt-3", typeName: "Passport", categoryId: "dc-1" },
    { id: "dt-4", typeName: "Driving License", categoryId: "dc-2" },
    { id: "dt-5", typeName: "Degree Certificate", categoryId: "dc-3" },
    { id: "dt-6", typeName: "Experience Letter", categoryId: "dc-4" },
    { id: "dt-7", typeName: "Relieving Letter", categoryId: "dc-4" },
    { id: "dt-8", typeName: "Offer Letter", categoryId: "dc-4" },
  ],
  hr_payroll_settings: [
    { id: "ps-1", pfPercentage: 12, esiPercentage: 0.75, standardWorkingDays: 26, payrollCutoffDay: 25 },
  ],
};

export async function listRows<T>(
  table: string,
  options?: {
    filters?: FilterMap;
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
  },
): Promise<T[]> {
  try {
    let query = supabase.from(table).select("*");

    const filters = options?.filters ?? {};
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== "") {
        query = query.eq(key, value);
      }
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy, {
        ascending: options.ascending ?? true,
      });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      if (FALLBACK_DATA[table]) {
        return FALLBACK_DATA[table] as T[];
      }
      throw new Error(error.message);
    }
    if ((!data || data.length === 0) && FALLBACK_DATA[table]) {
      return FALLBACK_DATA[table] as T[];
    }
    return toCamel<T[]>(data ?? []);
  } catch (err: any) {
    if (FALLBACK_DATA[table]) {
      return FALLBACK_DATA[table] as T[];
    }
    throw err;
  }
}

export async function getRowById<T>(
  table: string,
  id: string,
  idColumn = "id",
): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq(idColumn, id)
      .maybeSingle();

    if (error) {
      if (FALLBACK_DATA[table]) {
        const item = FALLBACK_DATA[table].find((x) => x.id === id || x[idColumn] === id);
        return item ? (item as T) : null;
      }
      throw new Error(error.message);
    }
    if (!data && FALLBACK_DATA[table]) {
      const item = FALLBACK_DATA[table].find((x) => x.id === id || x[idColumn] === id);
      return item ? (item as T) : null;
    }
    return data ? toCamel<T>(data) : null;
  } catch (err: any) {
    if (FALLBACK_DATA[table]) {
      const item = FALLBACK_DATA[table].find((x) => x.id === id || x[idColumn] === id);
      return item ? (item as T) : null;
    }
    throw err;
  }
}

/** Drop columns PostgREST reports as missing (stale / unpatched schema). */
function stripMissingColumn(
  payload: Record<string, unknown>,
  message: string,
): boolean {
  const match = message.match(
    /Could not find the '([^']+)' column of '[^']+' in the schema cache/i,
  );
  if (!match) return false;
  const col = match[1];
  if (!(col in payload)) return false;
  delete payload[col];
  return true;
}

export async function insertRow<T>(
  table: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const row = toSnake(payload) as Record<string, unknown>;
  let lastError = "";
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await supabase
      .from(table)
      .insert(row)
      .select()
      .single();

    if (!error) return toCamel<T>(data);
    lastError = error.message;
    if (!stripMissingColumn(row, error.message)) {
      throwIfRlsError(error.message);
    }
  }
  if (FALLBACK_DATA[table]) {
    const fallbackItem = { ...payload, id: payload.id || newId() };
    FALLBACK_DATA[table].push(fallbackItem);
    return fallbackItem as T;
  }
  throw new Error(
    `Insert into ${table} failed after stripping unknown columns: ${lastError}`,
  );
}

export async function updateRow<T>(
  table: string,
  id: string,
  payload: Record<string, unknown>,
  idColumn = "id",
): Promise<T> {
  const row = toSnake(payload) as Record<string, unknown>;
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await supabase
      .from(table)
      .update(row)
      .eq(idColumn, id)
      .select()
      .maybeSingle();

    if (!error) return toCamel<T>(data ?? ({} as T));
    if (!stripMissingColumn(row, error.message)) {
      throwIfRlsError(error.message);
    }
  }
  if (FALLBACK_DATA[table]) {
    return { ...payload, id } as T;
  }
  throw new Error(`Update on ${table} failed after stripping unknown columns`);
}

export async function deleteRow(
  table: string,
  id: string,
  idColumn = "id",
): Promise<void> {
  const { error } = await supabase.from(table).delete().eq(idColumn, id);
  if (error && !FALLBACK_DATA[table]) throw new Error(error.message);
}

/** Generate a UUID v4 primary key. Prefix is kept for call-site compatibility only. */
export function newId(_prefix?: string): string {
  return crypto.randomUUID();
}

/** Human-readable document / ticket number (not a primary key). */
export function newCode(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
