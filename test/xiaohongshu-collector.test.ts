import { describe, expect, test } from "vitest";

import { collectXiaohongshuSuggestions } from "../src/collectors/xiaohongshu-suggestions.js";

describe("collectXiaohongshuSuggestions", () => {
  test("parses xiaohongshu recommendation payload", async () => {
    const fetchStub: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          code: 0,
          success: true,
          data: {
            suggestion_words: [{ search_word: "连衣裙穿搭" }, { search_word: "珍珠项链叠戴" }],
          },
        }),
      );

    const result = await collectXiaohongshuSuggestions(
      "连衣裙",
      fetchStub,
      "2026-03-14T09:00:00+08:00",
    );

    expect(result.records).toHaveLength(2);
    expect(result.records[0]?.provider).toBe("xiaohongshu");
    expect(result.records[0]?.category).toBe("apparel");
    expect(result.records[1]?.category).toBe("jewelry");
  });

  test("returns an empty result when the platform requires login", async () => {
    const fetchStub: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          code: -101,
          success: false,
          msg: "无登录信息，或登录信息为空",
          data: {},
        }),
      );

    const result = await collectXiaohongshuSuggestions(
      "连衣裙",
      fetchStub,
      "2026-03-14T09:00:00+08:00",
    );

    expect(result.records).toEqual([]);
  });
});
