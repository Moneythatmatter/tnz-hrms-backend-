import { z } from "zod";
import { nonEmptyString } from "../utils/validate.js";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "email is required")
    .email("Invalid email"),
  password: nonEmptyString("password"),
});
