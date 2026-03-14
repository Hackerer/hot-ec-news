import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { loadAppConfig } from "../src/config/load-config.js";

describe("loadAppConfig", () => {
  test("falls back to defaults when no app.json exists", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-config-"));
    const config = loadAppConfig(rootDir);

    expect(config.sources.some((source) => source.provider === "taobao")).toBe(true);
    expect(config.scheduler.defaultTime).toBe("09:00");
  });

  test("merges config/app.json overrides", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-config-"));
    mkdirSync(path.join(rootDir, "config"), { recursive: true });
    writeFileSync(
      path.join(rootDir, "config", "app.json"),
      JSON.stringify({
        autoPushOnDaily: true,
        seeds: {
          apparel: ["羽绒服"],
        },
        pushChannels: [
          {
            type: "wecom",
            enabled: true,
            dryRun: true,
          },
        ],
      }),
      "utf8",
    );

    const config = loadAppConfig(rootDir);
    expect(config.autoPushOnDaily).toBe(true);
    expect(config.seeds.apparel).toEqual(["羽绒服"]);
    expect(config.pushChannels).toHaveLength(1);
  });
});
