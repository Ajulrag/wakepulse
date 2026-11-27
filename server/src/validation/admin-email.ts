import { z } from "zod";

export const adminEmailSettingsSchema = z
  .object({
    senderName: z.string().trim().min(2).max(80),
    senderEmail: z.string().trim().email().max(254),
  })
  .strict();
