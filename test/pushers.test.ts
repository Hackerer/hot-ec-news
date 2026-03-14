import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { runFixtureDemo } from "../src/pipeline/run-fixture-demo.js";
import { pushLatestReport } from "../src/pipeline/push-latest-report.js";
import { buildWecomPayload } from "../src/pushers/wecom.js";

describe("pushLatestReport", () => {
  test("creates a dry-run wecom payload preview", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-push-"));
    runFixtureDemo(rootDir);

    const previewPath = await pushLatestReport({
      channel: "wecom",
      explicitRoot: rootDir,
      dryRun: true,
    });

    expect(existsSync(previewPath)).toBe(true);
  });

  test("creates a dry-run email preview", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-email-"));
    runFixtureDemo(rootDir);

    const previewPath = await pushLatestReport({
      channel: "email",
      explicitRoot: rootDir,
      dryRun: true,
    });

    expect(existsSync(previewPath)).toBe(true);
  });
});

describe("buildWecomPayload", () => {
  test("caps markdown payload size", () => {
    const payload = buildWecomPayload("a".repeat(5000));
    const content = (payload.markdown as { content: string }).content;
    expect(content.length).toBe(4000);
  });
});
