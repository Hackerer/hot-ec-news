import type {
  AggregatedHotword,
  CollectedHotword,
  DailyReport,
} from "../types/hotword.js";

const categoryTitles = {
  apparel: "服饰热词",
  shoes: "鞋靴热词",
  jewelry: "首饰热词",
  unknown: "未分类热词",
} as const;

export function aggregateHotwords(records: CollectedHotword[]): AggregatedHotword[] {
  const groups = new Map<string, CollectedHotword[]>();

  for (const record of records) {
    const bucket = groups.get(record.normalizedKeyword) ?? [];
    bucket.push(record);
    groups.set(record.normalizedKeyword, bucket);
  }

  return [...groups.values()]
    .map((bucket) => {
      const first = bucket[0];
      if (!first) {
        throw new Error("aggregateHotwords encountered an empty bucket");
      }

      const bestRank = Math.min(...bucket.map((item) => item.rank));
      const score = bucket.reduce((sum, item) => sum + item.scoreNormalized, 0);
      const latest = bucket
        .map((item) => item.capturedAt)
        .sort((left, right) => right.localeCompare(left))[0];

      if (!latest) {
        throw new Error(`No capture timestamp for keyword ${first.keyword}`);
      }

      return {
        keyword: first.keyword,
        normalizedKeyword: first.normalizedKeyword,
        category: first.category,
        score,
        sampleCount: bucket.length,
        providers: [...new Set(bucket.map((item) => item.provider))],
        sourceTiers: [...new Set(bucket.map((item) => item.sourceTier))],
        bestRank,
        capturedAt: latest,
      } satisfies AggregatedHotword;
    })
    .sort((left, right) => right.score - left.score || left.bestRank - right.bestRank);
}

export function buildDailyReport(
  records: CollectedHotword[],
  timezone: string,
): DailyReport {
  const aggregated = aggregateHotwords(records);
  const categories: DailyReport["sections"] = (["apparel", "shoes", "jewelry"] as const).map(
    (category) => ({
      category,
      title: categoryTitles[category],
      items: aggregated.filter((item) => item.category === category).slice(0, 10),
    }),
  );

  return {
    generatedAt: new Date().toISOString(),
    timezone,
    sections: categories,
    totals: {
      collected: records.length,
      aggregated: aggregated.length,
      categories: categories.filter((section) => section.items.length > 0).length,
    },
  };
}
