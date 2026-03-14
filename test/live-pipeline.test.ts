import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { runLiveCollection } from "../src/pipeline/run-live-collection.js";

describe("runLiveCollection", () => {
  test("collects from default enabled providers and writes raw snapshots", async () => {
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

      if (url.includes("douyin.com/aweme/v1/web/api/suggest_words")) {
        return new Response(
          JSON.stringify({
            data: [
              { word: "连衣裙穿搭", hot_value: 901 },
              { word: "运动鞋推荐", hot_value: 880 },
            ],
          }),
        );
      }

      if (url.includes("edith.xiaohongshu.com")) {
        return new Response(
          JSON.stringify({
            code: 0,
            success: true,
            data: {
              suggestion_words: [{ search_word: "连衣裙穿搭" }, { search_word: "珍珠项链叠戴" }],
            },
          }),
        );
      }

      if (url.includes("mobile.yangkeduo.com/api/search/guess_query")) {
        return new Response(
          JSON.stringify({
            hotqs: [{ q: "短靴女" }, { q: "珍珠项链" }],
            hotqs_sug: [{ q: "防晒衣女" }],
          }),
        );
      }

      throw new Error(`Unexpected URL: ${url}`);
    };

    const result = await runLiveCollection(rootDir, fetchStub, "2026-03-14T09:00:00+08:00");
    const markdown = readFileSync(result.reportPath, "utf8");

    expect(result.collected).toBeGreaterThan(0);
    expect(result.seeds.length).toBeGreaterThan(0);
    expect(existsSync(result.reportPath)).toBe(true);
    expect(existsSync(path.join(rootDir, "data", "raw", "taobao", "2026-03-14", "连衣裙.json"))).toBe(true);
    expect(existsSync(path.join(rootDir, "data", "raw", "douyin", "2026-03-14", "连衣裙.json"))).toBe(true);
    expect(existsSync(path.join(rootDir, "data", "raw", "xiaohongshu", "2026-03-14", "连衣裙.json"))).toBe(true);
    expect(existsSync(path.join(rootDir, "data", "raw", "pinduoduo", "2026-03-14", "连衣裙.json"))).toBe(true);
    expect(existsSync(path.join(rootDir, "data", "raw", "jd", "2026-03-14", "连衣裙.json"))).toBe(false);
    expect(markdown).toContain("连衣裙女夏");
  });
});
