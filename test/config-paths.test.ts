import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { runFixtureDemo } from "../src/pipeline/run-fixture-demo.js";

describe("configured report/database paths and categories", () => {
  test("uses custom paths and filters report sections by selected categories", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-config-paths-"));
    mkdirSync(path.join(rootDir, "config"), { recursive: true });
    writeFileSync(
      path.join(rootDir, "config", "app.json"),
      JSON.stringify({
        reportDir: "custom/reports",
        databasePath: "custom/db.sqlite",
        categories: ["apparel"],
      }),
      "utf8",
    );

    const result = runFixtureDemo(rootDir);
    const markdown = readFileSync(result.reportPath, "utf8");

    expect(result.reportPath).toContain(path.join("custom", "reports"));
    expect(existsSync(path.join(rootDir, "custom", "db.sqlite"))).toBe(true);
    expect(markdown).toContain("## 服饰热词");
    expect(markdown).not.toContain("## 鞋靴热词");
    expect(markdown).not.toContain("## 首饰热词");
  });
});
