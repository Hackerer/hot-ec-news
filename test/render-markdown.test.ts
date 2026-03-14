import { describe, expect, test } from "vitest";

import { buildDailyReport } from "../src/core/aggregate.js";
import { renderMarkdownReport } from "../src/reports/render-markdown.js";
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
    category: options.keyword.includes("戒") ? "jewelry" : "apparel",
    rank: 1,
    scoreNormalized: options.scoreNormalized,
    capturedAt: options.capturedAt,
  };
}

describe("renderMarkdownReport", () => {
  test("renders confidence and review sections", () => {
    const previous = [
      makeRecord({
        keyword: "连衣裙女夏",
        provider: "taobao",
        sourceTier: "primary",
        scoreNormalized: 80,
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
        scoreNormalized: 90,
        capturedAt: "2026-03-14T09:00:00+08:00",
      }),
      makeRecord({
        keyword: "戒指黄金",
        provider: "magicmirror",
        sourceTier: "secondary",
        scoreNormalized: 30,
        capturedAt: "2026-03-14T09:00:00+08:00",
      }),
    ];

    const report = buildDailyReport(current, "Asia/Shanghai", [], previous);
    const markdown = renderMarkdownReport(report);

    expect(markdown).toContain("## 高可信热词");
    expect(markdown).toContain("## 待人工复核");
    expect(markdown).toContain("可信度 高");
    expect(markdown).toContain("原因 单一信源、仅第二信源、新词未完成校验、低可信度");
  });
});
