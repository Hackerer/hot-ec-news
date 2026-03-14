import { describe, expect, test } from "vitest";

import { buildDailyReport } from "../src/core/aggregate.js";
import type { CollectedHotword, Provider, SourceTier } from "../src/types/hotword.js";

function makeRecord(options: {
  keyword: string;
  provider: Provider;
  sourceTier: SourceTier;
  category: "apparel" | "shoes" | "jewelry";
  rank: number;
  scoreNormalized: number;
  capturedAt: string;
}): CollectedHotword {
  return {
    provider: options.provider,
    sourceTier: options.sourceTier,
    sourceKind: options.sourceTier === "primary" ? "platform_suggestions" : "third_party",
    keyword: options.keyword,
    normalizedKeyword: options.keyword,
    category: options.category,
    rank: options.rank,
    scoreNormalized: options.scoreNormalized,
    capturedAt: options.capturedAt,
  };
}

describe("category section structure", () => {
  test("builds overall top15 and platform sections per category", () => {
    const current: CollectedHotword[] = [];

    for (let index = 1; index <= 18; index += 1) {
      current.push(
        makeRecord({
          keyword: `服饰词${index}`,
          provider: index % 2 === 0 ? "taobao" : "jd",
          sourceTier: "primary",
          category: "apparel",
          rank: index,
          scoreNormalized: 200 - index,
          capturedAt: "2026-03-14T09:00:00+08:00",
        }),
      );
    }

    current.push(
      makeRecord({
        keyword: "服饰校验词",
        provider: "chanmama",
        sourceTier: "secondary",
        category: "apparel",
        rank: 1,
        scoreNormalized: 60,
        capturedAt: "2026-03-14T09:00:00+08:00",
      }),
    );

    const report = buildDailyReport(current, "Asia/Shanghai");
    const apparel = report.sections.find((section) => section.category === "apparel");

    expect(apparel).toBeTruthy();
    expect(apparel?.overallItems).toHaveLength(15);
    expect(apparel?.items).toEqual(apparel?.overallItems);
    expect(apparel?.overallItems[0]?.keyword).toBe("服饰词1");
    expect(apparel?.platformSections.map((section) => section.provider)).toEqual([
      "taobao",
      "jd",
      "chanmama",
    ]);
    expect(apparel?.platformSections[0]?.title).toBe("淘宝/天猫");
  });
});
