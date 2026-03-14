import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { runFixtureDemo } from "../src/pipeline/run-fixture-demo.js";
import { generateScheduleFile } from "../src/pipeline/generate-schedules.js";
import { getWorkspaceStatus } from "../src/pipeline/status-overview.js";
import { HotwordDatabase } from "../src/storage/database.js";
import { createAppPaths, ensureAppDirectories } from "../src/utils/paths.js";

describe("getWorkspaceStatus", () => {
  test("summarizes latest report, scheduler artifacts, and push readiness", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-status-"));
    mkdirSync(path.join(rootDir, "config"), { recursive: true });
    writeFileSync(
      path.join(rootDir, "config", "app.json"),
      JSON.stringify({
        autoPushOnDaily: true,
        pushChannels: [
          { type: "wecom", enabled: true, dryRun: false },
          {
            type: "email",
            enabled: true,
            dryRun: false,
            smtpHost: "smtp.example.com",
            smtpUser: "bot",
            smtpPass: "secret",
            emailFrom: "bot@example.com",
            emailTo: "ops@example.com",
          },
        ],
        sources: [
          { provider: "taobao", enabled: true, tier: "primary", kind: "platform_suggestions" },
          { provider: "jd", enabled: true, tier: "primary", kind: "platform_suggestions" },
          { provider: "chanmama", enabled: true, tier: "secondary", kind: "third_party" },
        ],
      }),
      "utf8",
    );

    runFixtureDemo(rootDir);
    generateScheduleFile("macos", "09:00", rootDir);

    const status = getWorkspaceStatus(rootDir, {
      runtimePlatform: "linux",
    });

    expect(status.report.available).toBe(true);
    expect(status.report.aggregated).toBeGreaterThan(0);
    expect(status.sources.primary).toEqual(["taobao", "jd"]);
    expect(status.sources.secondary).toEqual(["chanmama"]);
    expect(status.scheduler.macosArtifactExists).toBe(true);
    expect(status.scheduler.windowsArtifactExists).toBe(false);
    expect(status.pushChannels[0]).toMatchObject({
      type: "wecom",
      readiness: "misconfigured",
    });
    expect(status.pushChannels[1]).toMatchObject({
      type: "email",
      readiness: "ready",
    });
  });

  test("reports missing latest report cleanly", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-status-"));
    const status = getWorkspaceStatus(rootDir, {
      runtimePlatform: "linux",
    });

    expect(status.report.available).toBe(false);
    expect(status.pushChannels).toHaveLength(2);
    expect(status.recentRuns).toEqual([]);
  });

  test("includes recent pipeline runs in reverse chronological order", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-status-"));
    const paths = createAppPaths(rootDir);
    ensureAppDirectories(paths);
    const database = new HotwordDatabase(paths.dbFile);
    database.init();
    database.savePipelineRun({
      runKey: "run-1",
      command: "run:daily",
      status: "failed",
      startedAt: "2026-03-13T09:00:00.000Z",
      finishedAt: "2026-03-13T09:00:02.000Z",
      warnings: ["taobao timeout"],
      importedFiles: [],
      skippedFiles: [],
      pushOutputs: [],
      errorMessage: "Network error",
    });
    database.savePipelineRun({
      runKey: "run-2",
      command: "run:daily",
      status: "success",
      startedAt: "2026-03-14T09:00:00.000Z",
      finishedAt: "2026-03-14T09:00:02.000Z",
      warnings: [],
      importedFiles: ["chanmama-sample.csv"],
      skippedFiles: [],
      pushOutputs: [],
      reportPath: path.join(rootDir, "data", "reports", "validated-2026-03-14.md"),
    });

    const status = getWorkspaceStatus(rootDir, {
      runtimePlatform: "linux",
    });

    expect(status.lastRun?.runKey).toBe("run-2");
    expect(status.recentRuns).toHaveLength(2);
    expect(status.recentRuns[0]).toMatchObject({
      runKey: "run-2",
      status: "success",
    });
    expect(status.recentRuns[1]).toMatchObject({
      runKey: "run-1",
      status: "failed",
      errorMessage: "Network error",
    });
  });
});
