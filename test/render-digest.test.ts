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
  test("renders category-first push sections from report summary", () => {
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
    expect(digest).toContain("## 服饰热词");
    expect(digest).toContain("### 整体搜索热词 Top15");
    expect(digest).toContain("### 淘宝/天猫 Top15（第一信源");
    expect(digest).toContain("### 蝉妈妈 Top15（第二信源");
    expect(digest).toContain("## 异常");
    expect(digest).toContain("连衣裙女夏");
    expect(digest).toContain("耳钉女");
  });

  test("falls back cleanly for legacy reports without new category fields", () => {
    const baseReport = buildDailyReport(
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
    const legacyReport = {
      generatedAt: baseReport.generatedAt,
      timezone: baseReport.timezone,
      sections: baseReport.sections.map((section) => ({
        category: section.category,
        title: section.title,
        items: section.items,
      })),
      validationHighlights: baseReport.validationHighlights,
      totals: {
        collected: baseReport.totals.collected,
        aggregated: baseReport.totals.aggregated,
        categories: baseReport.totals.categories,
        validated: baseReport.totals.validated,
        primaryOnly: baseReport.totals.primaryOnly,
        secondaryOnly: baseReport.totals.secondaryOnly,
      },
    } as unknown as Parameters<typeof renderPushDigestMarkdown>[1];

    const digest = renderPushDigestMarkdown("validated-2026-03-14", legacyReport);
    const html = renderEmailHtml("validated-2026-03-14", legacyReport);

    expect(digest).toContain("## 服饰热词");
    expect(digest).toContain("### 整体搜索热词 Top15");
    expect(html).toContain("整体搜索热词 Top15");
    expect(html).toContain("防晒衣女");
  });
});

describe("renderEmailHtml", () => {
  test("renders category-first html sections before review table", () => {
    const report = buildDailyReport(
      [
        makeRecord({
          keyword: "防晒衣女",
          provider: "taobao",
          sourceTier: "primary",
          scoreNormalized: 100,
          capturedAt: "2026-03-14T09:00:00+08:00",
        }),
        makeRecord({
          keyword: "防晒衣女",
          provider: "chanmama",
          sourceTier: "secondary",
          scoreNormalized: 80,
          capturedAt: "2026-03-14T09:00:00+08:00",
        }),
      ],
      "Asia/Shanghai",
    );

    const html = renderEmailHtml("validated-2026-03-14", report);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("整体搜索热词 Top15");
    expect(html).toContain("淘宝/天猫 Top15（第一信源");
    expect(html).toContain("蝉妈妈 Top15（第二信源");
    expect(html).toContain("高可信热词");
    expect(html).toContain("待人工复核");
    expect(html).toContain("聚合词条");
  });

  test("escapes untrusted keyword and warning values", () => {
    const report = buildDailyReport(
      [
        makeRecord({
          keyword: "<b>危险词</b>",
          provider: "magicmirror",
          sourceTier: "secondary",
          scoreNormalized: 30,
          capturedAt: "2026-03-14T09:00:00+08:00",
        }),
      ],
      "Asia/Shanghai",
      ['<script>alert("x")</script>'],
    );

    const html = renderEmailHtml("validated-2026-03-14", report);

    expect(html).toContain("&lt;b&gt;危险词&lt;/b&gt;");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(\"x\")</script>");
  });
});
