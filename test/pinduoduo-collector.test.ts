import { describe, expect, test } from "vitest";

import { collectPinduoduoSuggestions } from "../src/collectors/pinduoduo-suggestions.js";

describe("collectPinduoduoSuggestions", () => {
  test("parses pinduoduo guess query payload", async () => {
    const fetchStub: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          hotqs: [{ q: "连衣裙女夏" }, { q: "防晒衣女" }],
          hotqs_sug: [{ q: "连衣裙女夏" }, { q: "短靴女" }],
          req_id: "req-1",
        }),
      );

    const result = await collectPinduoduoSuggestions(
      "连衣裙",
      fetchStub,
      "2026-03-14T09:00:00+08:00",
    );

    expect(result.records).toHaveLength(3);
    expect(result.records[0]?.provider).toBe("pinduoduo");
    expect(result.records[0]?.keyword).toBe("连衣裙女夏");
    expect(result.records[2]?.keyword).toBe("短靴女");
  });

  test("returns an empty result when the platform redirects to the portal", async () => {
    const fetchStub: typeof fetch = async () =>
      new Response("<html>302 Found</html>", {
        status: 302,
        headers: {
          location: "https://mobile.yangkeduo.com/portal.html?redirect_from=/api/search/guess_query",
        },
      });

    const result = await collectPinduoduoSuggestions(
      "连衣裙",
      fetchStub,
      "2026-03-14T09:00:00+08:00",
    );

    expect(result.records).toEqual([]);
  });
});
