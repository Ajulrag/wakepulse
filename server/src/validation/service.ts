import { z } from "zod";

export const serviceProviderSchema = z.enum([
  "render",
  "railway",
  "fly",
  "koyeb",
  "vercel",
  "custom",
]);

export const httpMethodSchema = z.enum([
  "GET",
  "HEAD",
  "POST",
]);

export const createServiceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Service name must be at least 2 characters")
    .max(100, "Service name must be at most 100 characters"),

  provider: serviceProviderSchema,

  url: z
    .string()
    .trim()
    .url("Please provide a valid URL"),

  endpoint: z
    .string()
    .trim()
    .min(1, "Endpoint is required")
    .max(500, "Endpoint is too long"),

  method: httpMethodSchema.default("GET"),

  intervalSeconds: z
    .number()
    .int("Interval must be a whole number")
    .min(30, "Interval must be at least 30 seconds")
    .max(
      24 * 60 * 60,
      "Interval cannot exceed 24 hours",
    )
    .default(300),

  timeoutSeconds: z
    .number()
    .int("Timeout must be a whole number")
    .min(5, "Timeout must be at least 5 seconds")
    .max(60, "Timeout cannot exceed 60 seconds")
    .default(15),
});

export type CreateServiceInput = z.infer<
  typeof createServiceSchema
>;