import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { createDefaultConfig } from "./defaults.js";
import { appConfigSchema, type AppConfig, type PushChannelConfig } from "./schema.js";

type PartialAppConfig = Partial<Omit<AppConfig, "scheduler" | "seeds" | "pushChannels">> & {
  scheduler?: Partial<AppConfig["scheduler"]>;
  seeds?: Partial<AppConfig["seeds"]>;
  pushChannels?: PushChannelConfig[];
};

function mergeConfig(base: AppConfig, override: PartialAppConfig): AppConfig {
  return {
    ...base,
    ...override,
    seeds: {
      ...base.seeds,
      ...override.seeds,
    },
    scheduler: {
      ...base.scheduler,
      ...override.scheduler,
    },
    sources: override.sources ?? base.sources,
    pushChannels: override.pushChannels ?? base.pushChannels,
  };
}

export function resolveConfigPath(rootDir: string): string {
  return path.join(rootDir, "config", "app.json");
}

export function loadAppConfig(rootDir: string): AppConfig {
  const defaults = createDefaultConfig();
  const configPath = resolveConfigPath(rootDir);

  if (!existsSync(configPath)) {
    return defaults;
  }

  const source = readFileSync(configPath, "utf8");
  const parsed = JSON.parse(source) as PartialAppConfig;
  return appConfigSchema.parse(mergeConfig(defaults, parsed));
}
