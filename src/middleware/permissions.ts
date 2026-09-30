import type { NextFunction, Response } from "express";
import { PermissionError } from "../errors/index.js";
import {
  isHrApiAllowed,
  isPlatformUsersApiAllowed,
  type PermissionMap,
} from "../lib/hr-api-permissions.js";
import { UserAdminService } from "../services/platform/user-admin.service.js";
import { isPlatformAdmin } from "../utils/platform-admin.js";
import { fail, fromError } from "../utils/response.js";
import type { ContextRequest } from "./request-context.js";

export type PermissionRequest = ContextRequest & {
  permissions?: PermissionMap;
};

async function loadPermissions(req: PermissionRequest): Promise<PermissionMap> {
  if (req.permissions) return req.permissions;
  if (!req.auth?.userId) throw new PermissionError("Authentication required");

  const permissions = await UserAdminService.getMyPermissions(
    req.auth.userId,
    req.auth.isSuperAdmin,
  );
  req.permissions = permissions;
  return permissions;
}

export function hrPermissionGuard(
  req: PermissionRequest,
  res: Response,
  next: NextFunction,
) {
  void (async () => {
    try {
      if (req.auth?.isSuperAdmin) return next();

      const permissions = await loadPermissions(req);
      const apiPath = req.path || "/";
      if (!isHrApiAllowed(req.method, apiPath, permissions)) {
        return fail(res, "You do not have permission to access this resource", 403);
      }
      next();
    } catch (e) {
      return fromError(res, e);
    }
  })();
}

export function platformUsersPermissionGuard(
  req: PermissionRequest,
  res: Response,
  next: NextFunction,
) {
  void (async () => {
    try {
      if (req.auth?.isSuperAdmin) return next();
      if (
        isPlatformAdmin({
          isSuperAdmin: req.auth?.isSuperAdmin,
          role: req.auth?.role,
        })
      ) {
        return next();
      }

      const permissions = await loadPermissions(req);
      if (!isPlatformUsersApiAllowed(req.method, permissions)) {
        return fail(res, "You do not have permission to manage users", 403);
      }
      next();
    } catch (e) {
      return fromError(res, e);
    }
  })();
}
