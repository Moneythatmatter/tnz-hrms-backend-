import { AsyncLocalStorage } from "node:async_hooks";

export type RequestStore = {
  userId?: string;
  userRole?: string;
  isSuperAdmin?: boolean;
};

export const requestContext = new AsyncLocalStorage<RequestStore>();

export function getRequestStore(): RequestStore | undefined {
  return requestContext.getStore();
}

export function runWithRequestStore<T>(store: RequestStore, fn: () => T): T {
  return requestContext.run(store, fn);
}
