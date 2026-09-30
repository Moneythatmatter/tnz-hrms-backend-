import type { NextFunction, Response } from "express";
import type { AuthedRequest } from "./auth.js";
import { runWithRequestStore } from "../utils/request-context.js";

export type ContextRequest = AuthedRequest;

export function attachRequestContext(
  req: ContextRequest,
  _res: Response,
  next: NextFunction,
) {
  const store = {
    userId: req.auth?.userId,
    userRole: req.auth?.role,
    isSuperAdmin: req.auth?.isSuperAdmin,
  };
  runWithRequestStore(store, () => next());
}
