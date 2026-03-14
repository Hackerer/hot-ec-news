import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { runLiveCollection } from "../src/pipeline/run-live-collection.js";

describe("runLiveCollection", () => {
  test("collects from both providers and writes raw snapshots", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-live-"));
    const fetchStub: typeof fetch = async (input) => {
      const url = String(input);

      if (url.includes("suggest.taobao.com")) {
        return new Response(
          JSON.stringify({
            result: [
              ["连衣裙女夏", "20429.142072672043"],
              ["防晒衣女", "18300.11"],
            ],
            tmall: "连衣裙",
          }),
        );
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
    expect(result.seeds.length).toBeGreaterThan(0);
    expect(existsSync(result.reportPath)).toBe(true);
    expect(existsSync(path.join(rootDir, "data", "raw", "taobao", "2026-03-14", "连衣裙.json"))).toBe(true);
    expect(existsSync(path.join(rootDir, "data", "raw", "jd", "2026-03-14", "连衣裙.json"))).toBe(true);
    expect(markdown).toContain("连衣裙女夏");
  });
});
