import { describe, expect, test } from "vitest";

import { buildDailyReport } from "../src/core/aggregate.js";
import type { CollectedHotword, Provider, SourceTier } from "../src/types/hotword.js";

function makeRecord(options: {
  keyword: string;
  provider: Provider;
  sourceTier: SourceTier;
  scoreNormalized: number;
  capturedAt: string;
}): CollectedHotword {
  return {
    provider: options.provider,
    sourceTier: options.sourceTier,
    sourceKind: options.sourceTier === "primary" ? "platform_suggestions" : "third_party",
    keyword: options.keyword,
    normalizedKeyword: options.keyword,
    category: options.keyword.includes("鞋") ? "shoes" : "apparel",
    rank: 1,
    scoreNormalized: options.scoreNormalized,
    capturedAt: options.capturedAt,
  };
}

describe("buildDailyReport confidence bands", () => {
  test("classifies high-confidence and review-needed keywords", () => {
    const previous = [
      makeRecord({
        keyword: "连衣裙女夏",
        provider: "taobao",
        sourceTier: "primary",
        scoreNormalized: 90,
        capturedAt: "2026-03-13T09:00:00+08:00",
      }),
    ];

    const current = [
      makeRecord({
        keyword: "连衣裙女夏",
        provider: "taobao",
        sourceTier: "primary",
        scoreNormalized: 120,
        capturedAt: "2026-03-14T09:00:00+08:00",
      }),
      makeRecord({
        keyword: "连衣裙女夏",
        provider: "chanmama",
        sourceTier: "secondary",
        scoreNormalized: 96,
        capturedAt: "2026-03-14T09:00:00+08:00",
      }),
      makeRecord({
        keyword: "防晒衣女",
        provider: "jd",
        sourceTier: "primary",
        scoreNormalized: 40,
        capturedAt: "2026-03-14T09:00:00+08:00",
      }),
      makeRecord({
        keyword: "耳钉女",
        provider: "magicmirror",
        sourceTier: "secondary",
        scoreNormalized: 35,
        capturedAt: "2026-03-14T09:00:00+08:00",
      }),
    ];

    const report = buildDailyReport(current, "Asia/Shanghai", [], previous);
    const highConfidence = report.confidenceHighlights.find((item) => item.keyword === "连衣裙女夏");
    const reviewPrimary = report.reviewHighlights.find((item) => item.keyword === "防晒衣女");
    const reviewSecondary = report.reviewHighlights.find((item) => item.keyword === "耳钉女");

    expect(highConfidence?.confidenceBand).toBe("high");
    expect(highConfidence?.reviewFlags).toHaveLength(0);

    expect(reviewPrimary?.confidenceBand).toBe("low");
    expect(reviewPrimary?.reviewFlags).toContain("single_source");
    expect(reviewPrimary?.reviewFlags).toContain("new_unvalidated");
    expect(reviewPrimary?.reviewFlags).toContain("low_confidence");

    expect(reviewSecondary?.confidenceBand).toBe("low");
    expect(reviewSecondary?.reviewFlags).toContain("secondary_only");
    expect(report.totals.highConfidence).toBe(1);
    expect(report.totals.reviewNeeded).toBe(2);
  });
});
