import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { runFixtureDemo } from "../src/pipeline/run-fixture-demo.js";
import { pushLatestReport } from "../src/pipeline/push-latest-report.js";

describe("category report acceptance", () => {
  test("produces category-first markdown, wecom preview, and email preview", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-category-acceptance-"));
    const result = runFixtureDemo(rootDir);

    const wecomPreview = await pushLatestReport({
      channel: "wecom",
      explicitRoot: rootDir,
      dryRun: true,
    });
    const emailPreview = await pushLatestReport({
      channel: "email",
      explicitRoot: rootDir,
      dryRun: true,
    });

    expect(existsSync(result.reportPath)).toBe(true);
    expect(existsSync(wecomPreview)).toBe(true);
    expect(existsSync(emailPreview)).toBe(true);

    const markdown = readFileSync(result.reportPath, "utf8");
    const wecom = readFileSync(wecomPreview, "utf8");
    const email = readFileSync(emailPreview, "utf8");

    for (const content of [markdown, wecom, email]) {
      expect(content).toContain("服饰热词");
      expect(content).toContain("整体搜索热词 Top15");
      expect(content).toContain("淘宝/天猫 Top15");
    }
  });

  test("produces a full email preview from the generated markdown report", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-category-full-"));
    const result = runFixtureDemo(rootDir);

    const emailPreview = await pushLatestReport({
      channel: "email",
      format: "full",
      explicitRoot: rootDir,
      dryRun: true,
    });

    expect(existsSync(result.reportPath)).toBe(true);
    expect(existsSync(emailPreview)).toBe(true);

    const markdown = readFileSync(result.reportPath, "utf8");
    const email = readFileSync(emailPreview, "utf8");

    expect(markdown).toContain("# 每日电商热词日报");
    expect(email).toContain("每日电商热词日报");
    expect(email).toContain("第三方校验结果");
    expect(email).toContain("连续上榜词");
  });
});
