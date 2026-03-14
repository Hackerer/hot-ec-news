import { z } from "zod";

import { providerValues } from "../types/hotword.js";

export const sourceConfigSchema = z.object({
  provider: z.enum(providerValues),
  enabled: z.boolean(),
  tier: z.enum(["primary", "secondary"]),
  kind: z.enum(["platform_suggestions", "third_party", "fixture", "manual"]),
});

export const seedsConfigSchema = z.object({
  apparel: z.array(z.string().min(1)),
  shoes: z.array(z.string().min(1)),
  jewelry: z.array(z.string().min(1)),
});

export const pushChannelSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("wecom"),
    enabled: z.boolean(),
    dryRun: z.boolean(),
    webhookUrl: z.string().url().optional(),
  }),
  z.object({
    type: z.literal("email"),
    enabled: z.boolean(),
    dryRun: z.boolean(),
    smtpHost: z.string().min(1).optional(),
    smtpPort: z.number().int().positive().optional(),
    smtpSecure: z.boolean().optional(),
    smtpUser: z.string().min(1).optional(),
    smtpPass: z.string().min(1).optional(),
    emailFrom: z.string().min(1).optional(),
    emailTo: z.string().min(1).optional(),
  }),
]);

export const appConfigSchema = z.object({
  timezone: z.string().min(1),
  reportDir: z.string().min(1),
  databasePath: z.string().min(1),
  categories: z.array(z.enum(["apparel", "shoes", "jewelry"])),
  seeds: seedsConfigSchema,
  sources: z.array(sourceConfigSchema),
  pushChannels: z.array(pushChannelSchema),
  autoPushOnDaily: z.boolean(),
  scheduler: z.object({
    defaultTime: z.string().regex(/^\d{2}:\d{2}$/),
  }),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
export type PushChannelConfig = z.infer<typeof pushChannelSchema>;
