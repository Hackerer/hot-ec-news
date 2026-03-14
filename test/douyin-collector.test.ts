import { describe, expect, test } from "vitest";

import { collectDouyinSuggestions } from "../src/collectors/douyin-suggestions.js";

describe("collectDouyinSuggestions", () => {
  test("parses douyin suggestion payload", async () => {
    const fetchStub: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          data: [
            { word: "连衣裙穿搭", hot_value: 982 },
            { word: "运动鞋推荐", hot_value: 901 },
          ],
        }),
      );

    const result = await collectDouyinSuggestions("连衣裙", fetchStub, "2026-03-14T09:00:00+08:00");

    expect(result.records).toHaveLength(2);
    expect(result.records[0]?.provider).toBe("douyin");
    expect(result.records[0]?.keyword).toBe("连衣裙穿搭");
    expect(result.records[0]?.scoreRaw).toBe(982);
  });
});
