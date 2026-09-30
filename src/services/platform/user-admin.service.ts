import bcrypt from "bcryptjs";
import { supabase } from "../../utils/supabase.js";
import { toCamel } from "../../utils/mappers.js";
import { AppError, NotFoundError, PermissionError } from "../../errors/index.js";
import type { AuthUserPublic, AuthUserRow } from "../../types/auth.js";
import type { PermissionLevel, UserPermissionRow } from "../../types/platform.js";
import { PLATFORM_MODULES } from "../../types/platform.js";
import { isPlatformAdmin } from "../../utils/platform-admin.js";
import { hrTables } from "../../models/human-resources/index.js";

const USERS = "users";
const PERMS = "user_permissions";

export type LinkedEmployeeSummary = {
  id: string;
  empCode: string;
  firstName: string;
  lastName: string;
  email: string;
} | null;

function toPublic(user: AuthUserRow): AuthUserPublic {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    initials: user.initials,
    isSuperAdmin: Boolean(user.isSuperAdmin),
    employeeId: user.employeeId ?? null,
  };
}

export type ManagedUser = AuthUserPublic & {
  status: string;
  permissions: UserPermissionRow[];
  linkedEmployee: LinkedEmployeeSummary;
};

async function loadEmployeeSummary(employeeId: string | null | undefined): Promise<LinkedEmployeeSummary> {
  if (!employeeId) return null;
  const { data, error } = await supabase
    .from(hrTables.employees)
    .select("id, emp_code, first_name, last_name, email")
    .eq("id", employeeId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: String(data.id),
    empCode: String(data.emp_code ?? ""),
    firstName: String(data.first_name ?? ""),
    lastName: String(data.last_name ?? ""),
    email: String(data.email ?? ""),
  };
}

async function assertEmployeeAvailable(employeeId: string, exceptUserId?: string): Promise<void> {
  const { data, error } = await supabase
    .from(USERS)
    .select("id, name, email")
    .eq("employee_id", employeeId)
    .maybeSingle();
  if (error) throw new AppError(error.message, 500);
  if (data && String(data.id) !== exceptUserId) {
    throw new AppError(
      `This employee is already linked to user "${data.name}" (${data.email}).`,
      409,
      "EMPLOYEE_ALREADY_LINKED",
    );
  }
}

async function resolveEmployeeLink(
  employeeId: string | null | undefined,
  exceptUserId?: string,
): Promise<{ employeeId: string | null; email?: string; name?: string }> {
  if (!employeeId) return { employeeId: null };

  const { data: emp, error } = await supabase
    .from(hrTables.employees)
    .select("id, emp_code, first_name, last_name, email, status")
    .eq("id", employeeId)
    .maybeSingle();
  if (error) throw new AppError(error.message, 500);
  if (!emp) throw new AppError("Employee not found", 404);

  await assertEmployeeAvailable(String(emp.id), exceptUserId);

  const firstName = String(emp.first_name ?? "");
  const lastName = String(emp.last_name ?? "");
  return {
    employeeId: String(emp.id),
    email: String(emp.email ?? "").trim().toLowerCase(),
    name: `${firstName} ${lastName}`.trim() || undefined,
  };
}

export const UserAdminService = {
  assertSuperAdmin(isSuperAdmin?: boolean, role?: string) {
    if (!isPlatformAdmin({ isSuperAdmin, role }))
      throw new PermissionError("Administrator access required");
  },

  async listUsers(): Promise<ManagedUser[]> {
    const { data: users, error } = await supabase.from(USERS).select("*").order("name");
    if (error) throw new AppError(error.message, 500);

    const rows = toCamel<AuthUserRow[]>(users ?? []);
    const result: ManagedUser[] = [];

    for (const user of rows) {
      if (user.isSuperAdmin) continue;

      const { data: perms } = await supabase
        .from(PERMS)
        .select("*")
        .eq("user_id", user.id);

      const linkedEmployee = await loadEmployeeSummary(user.employeeId);

      result.push({
        ...toPublic(user),
        status: user.status ?? "Active",
        permissions: toCamel<UserPermissionRow[]>(perms ?? []),
        linkedEmployee,
      });
    }
    return result;
  },

  async createUser(input: {
    name: string;
    email: string;
    password: string;
    role?: string;
    initials?: string;
    isSuperAdmin?: boolean;
    employeeId?: string | null;
    permissions?: Array<{
      moduleKey: string;
      permission: PermissionLevel;
    }>;
  }): Promise<ManagedUser> {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    if (!email || !name || !input.password) {
      throw new AppError("Name, email, and password are required", 400);
    }

    const link = await resolveEmployeeLink(input.employeeId);
    const resolvedEmail = link.email ?? email;
    const resolvedName = link.name ?? name;

    const id = `U-${Date.now().toString(36).toUpperCase()}`;
    const passwordHash = await bcrypt.hash(input.password, 10);
    const initials =
      input.initials?.trim() ||
      resolvedName
        .split(/\s+/)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const { error } = await supabase
      .from(USERS)
      .insert({
        id,
        name: resolvedName,
        email: resolvedEmail,
        password_hash: passwordHash,
        role: input.role?.trim() || "Staff",
        initials,
        status: "Active",
        is_super_admin: false,
        employee_id: link.employeeId,
      })
      .select()
      .single();
    if (error) throw new AppError(error.message, 500);

    await UserAdminService.setUserPermissions(id, input.permissions ?? []);

    const listed = await UserAdminService.listUsers();
    const created = listed.find((u) => u.id === id);
    if (!created) throw new AppError("Failed to load created user", 500);
    return created;
  },

  async setUserPermissions(
    userId: string,
    permissions: Array<{
      moduleKey: string;
      permission: PermissionLevel;
    }>,
  ): Promise<void> {
    await supabase.from(PERMS).delete().eq("user_id", userId);

    const validModules = new Set(PLATFORM_MODULES.map((m) => m.key));
    const permRows = permissions
      .filter((p) => validModules.has(p.moduleKey as never))
      .map((p) => ({
        id: crypto.randomUUID(),
        user_id: userId,
        module_key: p.moduleKey,
        permission: p.permission,
      }));

    if (permRows.length) {
      const { error } = await supabase.from(PERMS).insert(permRows);
      if (error) throw new AppError(error.message, 500);
    }
  },

  async updateUser(
    userId: string,
    patch: {
      name?: string;
      role?: string;
      status?: string;
      isSuperAdmin?: boolean;
      employeeId?: string | null;
      permissions?: Array<{
        moduleKey: string;
        permission: PermissionLevel;
      }>;
    },
  ): Promise<ManagedUser> {
    const { data: existing, error: existingError } = await supabase
      .from(USERS)
      .select("is_super_admin")
      .eq("id", userId)
      .maybeSingle();
    if (existingError) throw new AppError(existingError.message, 500);
    if (!existing) throw new NotFoundError("User not found");
    if (existing.is_super_admin) {
      throw new PermissionError("Super administrator accounts cannot be managed here");
    }

    const body: Record<string, unknown> = {};
    if (patch.name != null) body.name = patch.name.trim();
    if (patch.role != null) body.role = patch.role.trim();
    if (patch.status != null) body.status = patch.status;

    if (patch.employeeId !== undefined) {
      const link = await resolveEmployeeLink(patch.employeeId, userId);
      body.employee_id = link.employeeId;
      if (link.email) body.email = link.email;
      if (link.name && patch.name == null) body.name = link.name;
    }

    if (Object.keys(body).length) {
      const { error } = await supabase.from(USERS).update(body).eq("id", userId);
      if (error) throw new AppError(error.message, 500);
    }

    if (patch.permissions) {
      await UserAdminService.setUserPermissions(userId, patch.permissions);
    }

    const listed = await UserAdminService.listUsers();
    const updated = listed.find((u) => u.id === userId);
    if (!updated) throw new NotFoundError("User not found");
    return updated;
  },

  async getMyPermissions(
    userId: string,
    isSuperAdmin?: boolean,
  ): Promise<Record<string, PermissionLevel | "admin">> {
    if (isSuperAdmin) {
      return Object.fromEntries(
        PLATFORM_MODULES.map((m) => [m.key, "admin" as const]),
      );
    }
    const { data, error } = await supabase
      .from(PERMS)
      .select("*")
      .eq("user_id", userId);
    if (error) throw new AppError(error.message, 500);
    const map: Record<string, PermissionLevel> = {};
    for (const row of data ?? []) {
      map[String(row.module_key)] = row.permission as PermissionLevel;
    }
    return map;
  },
};
