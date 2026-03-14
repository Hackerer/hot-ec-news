import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { runLiveCollection } from "../src/pipeline/run-live-collection.js";

describe("runLiveCollection resilience", () => {
  test("continues when one provider fails and records warnings", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-resilience-"));
    const fetchStub: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("suggest.taobao.com")) {
        throw new Error("taobao unavailable");
      }

      return new Response(
        JSON.stringify([
          { keyword: "运动鞋男" },
          { keyword: "短靴女" },
          { keyword: "珍珠项链" },
        ]),
      );
    };

    const result = await runLiveCollection(rootDir, fetchStub, "2026-03-14T09:00:00+08:00");
    const markdown = readFileSync(result.reportPath, "utf8");

    expect(result.collected).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(markdown).toContain("## 备注与异常说明");
    expect(existsSync(path.join(rootDir, "data", "raw", "errors", "2026-03-14"))).toBe(true);
  });
});
