import type { AppConfig } from "./schema.js";

export function createDefaultConfig(): AppConfig {
  return {
    timezone: "Asia/Shanghai",
    reportDir: "data/reports",
    databasePath: "data/db/hot-ec-news.sqlite",
    categories: ["apparel", "shoes", "jewelry"],
    sources: [
      {
        provider: "taobao",
        enabled: true,
        tier: "primary",
        kind: "platform_suggestions",
      },
      {
        provider: "jd",
        enabled: true,
        tier: "primary",
        kind: "platform_suggestions",
      },
      {
        provider: "chanmama",
        enabled: false,
        tier: "secondary",
        kind: "third_party",
      },
    ],
  };
}
