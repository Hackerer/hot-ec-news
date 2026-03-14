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
    expect(payload.markdown.content).toContain("## 服饰热词");
    expect(payload.markdown.content).toContain("### 整体搜索热词 Top15");
    expect(payload.markdown.content).toContain("### 淘宝/天猫 Top15（第一信源");
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
    expect(preview).toContain("整体搜索热词 Top15");
  });

  test("creates a dry-run full email preview", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-email-full-"));
    runFixtureDemo(rootDir);

    const previewPath = await pushLatestReport({
      channel: "email",
      format: "full",
      explicitRoot: rootDir,
      dryRun: true,
    });

    expect(existsSync(previewPath)).toBe(true);
    const preview = readFileSync(previewPath, "utf8");
    expect(preview).toContain("\"subject\":\"hot-ec-news fixture-");
    expect(preview).toContain(" full\"");
    expect(preview).toContain("每日电商热词日报");
    expect(preview).toContain("第三方校验结果");
    expect(preview).toContain("完整日报正文");
  });
});

describe("buildWecomPayload", () => {
  test("caps markdown payload size", () => {
    const payload = buildWecomPayload("a".repeat(5000));
    const content = (payload.markdown as { content: string }).content;
    expect(content.length).toBe(4000);
  });
});
