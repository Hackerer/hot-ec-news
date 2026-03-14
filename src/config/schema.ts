import { z } from "zod";

export const sourceConfigSchema = z.object({
  provider: z.string(),
  enabled: z.boolean(),
  tier: z.enum(["primary", "secondary"]),
  kind: z.enum(["platform_suggestions", "third_party", "fixture", "manual"]),
});

export const appConfigSchema = z.object({
  timezone: z.string().min(1),
  reportDir: z.string().min(1),
  databasePath: z.string().min(1),
  categories: z.array(z.enum(["apparel", "shoes", "jewelry"])),
  sources: z.array(sourceConfigSchema),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
