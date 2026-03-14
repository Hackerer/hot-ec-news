import { describe, expect, test } from "vitest";

import { collectTaobaoSuggestions } from "../src/collectors/taobao-suggestions.js";

describe("collectTaobaoSuggestions", () => {
  test("parses taobao suggestion payload", async () => {
    const fetchStub: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          result: [
            ["连衣裙女夏", "20429.142072672043"],
            ["防晒衣女", "18300.11"],
          ],
          tmall: "连衣裙",
        }),
      );

    const result = await collectTaobaoSuggestions("连衣裙", fetchStub, "2026-03-14T09:00:00+08:00");

    expect(result.records).toHaveLength(2);
    expect(result.records[0]?.provider).toBe("taobao");
    expect(result.records[0]?.category).toBe("apparel");
    expect(result.records[0]?.scoreRaw).toBeGreaterThan(0);
  });
});
