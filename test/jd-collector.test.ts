import { describe, expect, test } from "vitest";

import { collectJdSuggestions } from "../src/collectors/jd-suggestions.js";

describe("collectJdSuggestions", () => {
  test("parses jd suggestion payload", async () => {
    const fetchStub: typeof fetch = async () =>
      new Response(
        JSON.stringify([
          { keyword: "运动鞋男" },
          { keyword: "短靴女" },
          { keyword: "珍珠项链" },
        ]),
      );

    const result = await collectJdSuggestions("运动鞋", fetchStub, "2026-03-14T09:00:00+08:00");

    expect(result.records).toHaveLength(3);
    expect(result.records[0]?.provider).toBe("jd");
    expect(result.records[0]?.scoreNormalized).toBeGreaterThan(result.records[1]?.scoreNormalized ?? 0);
  });
});
