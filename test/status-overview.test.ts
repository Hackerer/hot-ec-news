import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { runFixtureDemo } from "../src/pipeline/run-fixture-demo.js";
import { generateScheduleFile } from "../src/pipeline/generate-schedules.js";
import { getWorkspaceStatus } from "../src/pipeline/status-overview.js";

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
  });
});
