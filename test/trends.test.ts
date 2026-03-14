import { describe, expect, test } from "vitest";

import { buildDailyReport } from "../src/core/aggregate.js";
import type { CollectedHotword } from "../src/types/hotword.js";

function makeRecord(
  keyword: string,
  scoreNormalized: number,
  capturedAt: string,
): CollectedHotword {
  return {
    provider: "taobao",
    sourceTier: "primary",
    sourceKind: "platform_suggestions",
    keyword,
    normalizedKeyword: keyword,
    category: keyword.includes("鞋") ? "shoes" : "apparel",
    rank: 1,
    scoreNormalized,
    capturedAt,
  };
}

describe("buildDailyReport trends", () => {
  test("marks new and repeated entries against previous records", () => {
    const previous = [
      makeRecord("连衣裙女夏", 100, "2026-03-13T09:00:00+08:00"),
      makeRecord("短靴女", 90, "2026-03-13T09:00:00+08:00"),
    ];

    const current = [
      makeRecord("连衣裙女夏", 120, "2026-03-14T09:00:00+08:00"),
      makeRecord("防晒衣女", 110, "2026-03-14T09:00:00+08:00"),
      makeRecord("短靴女", 80, "2026-03-14T09:00:00+08:00"),
    ];

    const report = buildDailyReport(current, "Asia/Shanghai", [], previous);

    expect(report.totals.newEntries).toBe(1);
    expect(report.totals.repeatedEntries).toBe(2);
    expect(report.newHighlights[0]?.keyword).toBe("防晒衣女");
    expect(report.repeatedHighlights.some((item) => item.keyword === "连衣裙女夏")).toBe(true);
    expect(report.repeatedHighlights.some((item) => item.keyword === "短靴女")).toBe(true);
  });
});
