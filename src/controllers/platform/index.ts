import type { Response } from "express";
import { UserAdminService } from "../../services/platform/user-admin.service.js";
import { PLATFORM_MODULES } from "../../types/platform.js";
import { fromError, ok } from "../../utils/response.js";
import type { ContextRequest } from "../../middleware/request-context.js";

function authCtx(req: ContextRequest) {
  if (!req.auth?.userId) throw new Error("Unauthorized");
  return req.auth;
}

export async function listModules(_req: ContextRequest, res: Response) {
  return ok(res, PLATFORM_MODULES);
}

export async function listUsers(req: ContextRequest, res: Response) {
  try {
    authCtx(req);
    const rows = await UserAdminService.listUsers();
    return ok(res, rows);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function createUser(req: ContextRequest, res: Response) {
  try {
    authCtx(req);
    const body = req.body as Record<string, unknown>;
    const row = await UserAdminService.createUser({
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
      role: body.role ? String(body.role) : undefined,
      initials: body.initials ? String(body.initials) : undefined,
      isSuperAdmin: Boolean(body.isSuperAdmin),
      employeeId:
        body.employeeId != null && body.employeeId !== ""
          ? String(body.employeeId)
          : null,
      permissions: Array.isArray(body.permissions) ? body.permissions : [],
    });
    return ok(res, row, 201);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function updateUser(req: ContextRequest, res: Response) {
  try {
    authCtx(req);
    const body = req.body as Record<string, unknown>;
    const row = await UserAdminService.updateUser(String(req.params.id), {
      name: body.name != null ? String(body.name) : undefined,
      role: body.role != null ? String(body.role) : undefined,
      status: body.status != null ? String(body.status) : undefined,
      isSuperAdmin:
        body.isSuperAdmin != null ? Boolean(body.isSuperAdmin) : undefined,
      employeeId:
        body.employeeId !== undefined
          ? body.employeeId != null && body.employeeId !== ""
            ? String(body.employeeId)
            : null
          : undefined,
      permissions: Array.isArray(body.permissions) ? body.permissions : undefined,
    });
    return ok(res, row);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function myPermissions(req: ContextRequest, res: Response) {
  try {
    const auth = authCtx(req);
    const perms = await UserAdminService.getMyPermissions(
      auth.userId,
      auth.isSuperAdmin,
    );
    return ok(res, perms);
  } catch (e) {
    return fromError(res, e);
  }
}
