import { describe, expect, test } from "vitest";

import { createDefaultConfig } from "../src/config/defaults.js";

describe("createDefaultConfig", () => {
  test("includes the three target categories", () => {
    const config = createDefaultConfig();
    expect(config.categories).toEqual(["apparel", "shoes", "jewelry"]);
    expect(config.sources).toHaveLength(5);
    expect(config.sources.some((source) => source.provider === "jd")).toBe(false);
    expect(config.sources.filter((source) => source.tier === "primary").map((source) => source.provider)).toEqual([
      "taobao",
      "xiaohongshu",
      "douyin",
      "pinduoduo",
    ]);
  });
});
