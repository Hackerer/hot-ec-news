import { existsSync, mkdtempSync, readFileSync } from "node:fs";
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
    const payload = JSON.parse(readFileSync(previewPath, "utf8")) as {
      markdown: { content: string };
    };
    expect(payload.markdown.content).toContain("## 高可信热词");
    expect(payload.markdown.content).toContain("## 待人工复核");
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
    const preview = readFileSync(previewPath, "utf8");
    expect(preview).toContain("\"html\":\"<!doctype html>");
    expect(preview).toContain("高可信热词");
  });
});

describe("buildWecomPayload", () => {
  test("caps markdown payload size", () => {
    const payload = buildWecomPayload("a".repeat(5000));
    const content = (payload.markdown as { content: string }).content;
    expect(content.length).toBe(4000);
  });
});
