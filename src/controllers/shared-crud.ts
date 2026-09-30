import type { Request, Response, Router } from "express";
import {
  deleteRow,
  getRowById,
  insertRow,
  listRows,
  newId,
  updateRow,
} from "../models/base.js";
import { fail, fromError, ok } from "../utils/response.js";

type CrudOptions = {
  table: string;
  idPrefix: string;
  idColumn?: string;
  listFilters?: (req: Request) => Record<string, string | undefined>;
  orderBy?: string;
  mapIncoming?: (
    body: Record<string, unknown>,
    ctx?: { isCreate: boolean },
  ) => Record<string, unknown>;
  mapOutgoing?: <T>(row: T) => T;
};

export function createTableCrud(options: CrudOptions) {
  const idCol = options.idColumn ?? "id";

  return {
    async list(req: Request, res: Response) {
      try {
        const filters = options.listFilters?.(req) ?? {};
        let rows = await listRows(options.table, {
          filters,
          orderBy: options.orderBy ?? idCol,
        }).catch((err) => {
          console.warn(`[CRUD ${options.table} list fallback]`, err.message || err);
          return [];
        });
        if (options.mapOutgoing) {
          rows = rows.map((r: unknown) => options.mapOutgoing!(r));
        }
        return ok(res, rows);
      } catch (e) {
        return fromError(res, e);
      }
    },

    async get(req: Request, res: Response) {
      try {
        const id = String(req.params.id);
        let row = await getRowById(options.table, id, idCol);
        if (!row) return fail(res, "Not found", 404);
        if (options.mapOutgoing) row = options.mapOutgoing(row);
        return ok(res, row);
      } catch (e) {
        return fromError(res, e);
      }
    },

    async create(req: Request, res: Response) {
      try {
        let body = { ...(req.body as Record<string, unknown>) };
        if (options.mapIncoming) body = options.mapIncoming(body, { isCreate: true });
        if (!body[idCol]) {
          body[idCol] = newId(options.idPrefix);
        } else {
          const existing = await getRowById(options.table, String(body[idCol]), idCol);
          if (existing) {
            body[idCol] = newId(options.idPrefix);
          }
        }
        let row = await insertRow(options.table, body);
        if (options.mapOutgoing) row = options.mapOutgoing(row);
        return ok(res, row, 201);
      } catch (e) {
        return fromError(res, e);
      }
    },

    async update(req: Request, res: Response) {
      try {
        const id = String(req.params.id);
        let body = { ...(req.body as Record<string, unknown>) };
        delete body[idCol];
        delete body.id;
        if (options.mapIncoming) body = options.mapIncoming(body, { isCreate: false });
        let row = await updateRow(options.table, id, body, idCol);
        if (options.mapOutgoing) row = options.mapOutgoing(row);
        return ok(res, row);
      } catch (e) {
        return fromError(res, e);
      }
    },

    async remove(req: Request, res: Response) {
      try {
        const id = String(req.params.id);
        await deleteRow(options.table, id, idCol);
        return ok(res, { id });
      } catch (e) {
        return fromError(res, e);
      }
    },
  };
}

export function mountCrud(
  router: Router,
  path: string,
  controller: ReturnType<typeof createTableCrud>,
) {
  router.get(path, controller.list);
  router.get(`${path}/:id`, controller.get);
  router.post(path, controller.create);
  router.put(`${path}/:id`, controller.update);
  router.patch(`${path}/:id`, controller.update);
  router.delete(`${path}/:id`, controller.remove);
}
