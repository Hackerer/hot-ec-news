import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { runFixtureDemo } from "../src/pipeline/run-fixture-demo.js";

describe("runFixtureDemo", () => {
  test("creates a markdown report with category sections", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-pipeline-"));
    const result = runFixtureDemo(rootDir);
    const markdown = readFileSync(result.reportPath, "utf8");

    expect(result.collected).toBeGreaterThan(0);
    expect(existsSync(result.reportPath)).toBe(true);
    expect(markdown).toContain("## 服饰热词");
    expect(markdown).toContain("## 鞋靴热词");
    expect(markdown).toContain("## 首饰热词");
  });
});
