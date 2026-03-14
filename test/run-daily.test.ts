import { copyFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { runDailyPipeline } from "../src/pipeline/run-daily.js";
import { HotwordDatabase } from "../src/storage/database.js";
import { createAppPaths } from "../src/utils/paths.js";
import { getWorkspaceStatus } from "../src/pipeline/status-overview.js";

describe("runDailyPipeline", () => {
  test("collects live data, imports third-party csv files, and writes a validated report", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-daily-"));
    const importsDir = path.join(rootDir, "data", "imports");
    mkdirSync(importsDir, { recursive: true });
    mkdirSync(path.join(rootDir, "config"), { recursive: true });
    writeFileSync(
      path.join(rootDir, "config", "app.json"),
      JSON.stringify({
        autoPushOnDaily: true,
        sources: [
          { provider: "taobao", enabled: true, tier: "primary", kind: "platform_suggestions" },
          { provider: "jd", enabled: true, tier: "primary", kind: "platform_suggestions" },
          { provider: "chanmama", enabled: true, tier: "secondary", kind: "third_party" }
        ],
        pushChannels: [
          { type: "wecom", enabled: true, dryRun: true }
        ]
      }),
      "utf8",
    );
    copyFileSync(
      path.resolve("fixtures/third-party/chanmama-sample.csv"),
      path.join(importsDir, "chanmama-sample.csv"),
    );

    const fetchStub: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("suggest.taobao.com")) {
        return new Response(
          JSON.stringify({
            result: [
              ["连衣裙女夏", "20429.142072672043"],
              ["防晒衣女", "18300.11"],
              ["短靴女", "16100.01"],
              ["戒指黄金", "15800.77"],
            ],
          }),
        );
      }

      return new Response(
        JSON.stringify([
          { keyword: "连衣裙女夏" },
          { keyword: "防晒衣女" },
          { keyword: "短靴女" },
          { keyword: "戒指黄金" },
        ]),
      );
    };

    const result = await runDailyPipeline(rootDir, fetchStub);
    expect(result.importedFiles).toContain("chanmama-sample.csv");
    expect(result.skippedFiles).toHaveLength(0);
    expect(result.pushOutputs).toHaveLength(1);
    expect(existsSync(result.reportPath)).toBe(true);

    const status = getWorkspaceStatus(rootDir, { runtimePlatform: "linux" });
    expect(status.lastRun?.status).toBe("success");
    expect(status.lastRun?.importedFiles).toContain("chanmama-sample.csv");
  });

  test("replaces same-day data instead of duplicating it on repeated runs", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-daily-"));
    const importsDir = path.join(rootDir, "data", "imports");
    mkdirSync(importsDir, { recursive: true });
    mkdirSync(path.join(rootDir, "config"), { recursive: true });
    writeFileSync(
      path.join(rootDir, "config", "app.json"),
      JSON.stringify({
        autoPushOnDaily: false,
        sources: [
          { provider: "taobao", enabled: true, tier: "primary", kind: "platform_suggestions" },
          { provider: "jd", enabled: true, tier: "primary", kind: "platform_suggestions" },
          { provider: "chanmama", enabled: true, tier: "secondary", kind: "third_party" }
        ],
        pushChannels: []
      }),
      "utf8",
    );
    copyFileSync(
      path.resolve("fixtures/third-party/chanmama-sample.csv"),
      path.join(importsDir, "chanmama-sample.csv"),
    );

    const fetchStub: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("suggest.taobao.com")) {
        return new Response(
          JSON.stringify({
            result: [
              ["连衣裙女夏", "20429.142072672043"],
              ["防晒衣女", "18300.11"],
              ["短靴女", "16100.01"],
              ["戒指黄金", "15800.77"],
            ],
          }),
        );
      }

      return new Response(
        JSON.stringify([
          { keyword: "连衣裙女夏" },
          { keyword: "防晒衣女" },
          { keyword: "短靴女" },
          { keyword: "戒指黄金" },
        ]),
      );
    };

    await runDailyPipeline(rootDir, fetchStub);
    const database = new HotwordDatabase(createAppPaths(rootDir).dbFile);
    database.init();
    const datePrefix = new Date().toISOString().slice(0, 10);
    const firstRunCount = database.listHotwordsByDate(datePrefix).length;

    await runDailyPipeline(rootDir, fetchStub);
    const secondRunCount = database.listHotwordsByDate(datePrefix).length;
    const secondRun = await runDailyPipeline(rootDir, fetchStub);

    expect(secondRunCount).toBe(firstRunCount);
    expect(secondRun.importedFiles).toHaveLength(0);
    expect(secondRun.skippedFiles).toContain("chanmama-sample.csv");
  });
});
