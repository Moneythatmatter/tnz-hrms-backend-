import { z, type ZodTypeAny } from "zod";
import { ValidationError } from "../errors/index.js";

export function parseBody<T extends ZodTypeAny>(
  schema: T,
  body: unknown,
): z.infer<T> {
  const result = schema.safeParse(body);
  if (result.success) return result.data;

  const details = result.error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));

  throw new ValidationError("Validation failed", details);
}

/** Optional email: allow empty string, otherwise must be valid. */
export const optionalEmail = z
  .string()
  .trim()
  .refine((v) => v === "" || z.string().email().safeParse(v).success, {
    message: "Invalid email",
  })
  .optional();

export const nonEmptyString = (label: string) =>
  z.string().trim().min(1, `${label} is required`);

export const nonNegativeNumber = z.coerce.number().finite().min(0);
export const positiveNumber = z.coerce.number().finite().positive();
