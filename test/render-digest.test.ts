import { describe, expect, test } from "vitest";

import { buildDailyReport } from "../src/core/aggregate.js";
import { renderEmailHtml, renderPushDigestMarkdown } from "../src/pushers/render-digest.js";
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

describe("renderPushDigestMarkdown", () => {
  test("renders compact push sections from report summary", () => {
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
        scoreNormalized: 96,
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

    const report = buildDailyReport(current, "Asia/Shanghai", ["jd 采集失败"], previous);
    const digest = renderPushDigestMarkdown("validated-2026-03-14", report);

    expect(digest).toContain("# hot-ec-news validated-2026-03-14");
    expect(digest).toContain("## 高可信热词");
    expect(digest).toContain("## 待人工复核");
    expect(digest).toContain("## 异常");
    expect(digest).toContain("连衣裙女夏");
    expect(digest).toContain("耳钉女");
  });
});

describe("renderEmailHtml", () => {
  test("renders html summary cards and review table", () => {
    const report = buildDailyReport(
      [
        makeRecord({
          keyword: "防晒衣女",
          provider: "taobao",
          sourceTier: "primary",
          scoreNormalized: 100,
          capturedAt: "2026-03-14T09:00:00+08:00",
        }),
      ],
      "Asia/Shanghai",
    );

    const html = renderEmailHtml("validated-2026-03-14", report);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("高可信热词");
    expect(html).toContain("待人工复核");
    expect(html).toContain("聚合词条");
  });
});
