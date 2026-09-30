/** Convert snake_case object keys to camelCase (one level + nested objects/arrays). */
const SNAKE_TO_CAMEL_OVERRIDES: Record<string, string> = {
  linked_pr: "linkedPR",
  linked_rfq: "linkedRFQ",
};

function snakeKeyToCamel(key: string): string {
  if (SNAKE_TO_CAMEL_OVERRIDES[key]) return SNAKE_TO_CAMEL_OVERRIDES[key];
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function toCamel<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((item) => toCamel(item)) as T;
  }
  if (input !== null && typeof input === "object" && !(input instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      result[snakeKeyToCamel(key)] = toCamel(value);
    }
    return result as T;
  }
  return input as T;
}

/** Convert camelCase object keys to snake_case (one level). */
const CAMEL_TO_SNAKE_OVERRIDES: Record<string, string> = {
  linkedPR: "linked_pr",
  linkedRFQ: "linked_rfq",
};

export function toSnake(input: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const snakeKey =
      CAMEL_TO_SNAKE_OVERRIDES[key] ??
      key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
    if (value !== undefined) {
      result[snakeKey] = value;
    }
  }
  return result;
}
