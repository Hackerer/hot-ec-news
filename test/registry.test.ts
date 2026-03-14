import { describe, expect, test } from "vitest";

import { createDefaultConfig } from "../src/config/defaults.js";
import { listEnabledLiveCollectors } from "../src/collectors/registry.js";
import { inferThirdPartyProvider, isEnabledThirdPartyProvider } from "../src/importers/registry.js";

describe("collector registry", () => {
  test("returns enabled primary collectors", () => {
    const config = createDefaultConfig();
    const collectors = listEnabledLiveCollectors(config);
    expect(collectors.map((collector) => collector.provider)).toEqual([
      "taobao",
      "xiaohongshu",
      "douyin",
      "pinduoduo",
    ]);
  });
});

describe("third-party importer registry", () => {
  test("infers provider from file names", () => {
    expect(inferThirdPartyProvider("chanmama-sample.csv")).toBe("chanmama");
    expect(inferThirdPartyProvider("feigua-export.csv")).toBe("feigua");
  });

  test("checks whether a secondary provider is enabled", () => {
    const config = createDefaultConfig();
    expect(isEnabledThirdPartyProvider("chanmama", config)).toBe(false);
    expect(isEnabledThirdPartyProvider("feigua", config)).toBe(false);
  });
});
