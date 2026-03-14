import type {
  AggregatedHotword,
  CollectedHotword,
  DailyReport,
  Provider,
  ValidationStatus,
} from "../types/hotword.js";

const categoryTitles = {
  apparel: "服饰热词",
  shoes: "鞋靴热词",
  jewelry: "首饰热词",
  unknown: "未分类热词",
} as const;

function resolveValidationStatus(sourceTiers: CollectedHotword["sourceTier"][]): ValidationStatus {
  const hasPrimary = sourceTiers.includes("primary");
  const hasSecondary = sourceTiers.includes("secondary");

  if (hasPrimary && hasSecondary) {
    return "validated";
  }

  if (hasPrimary) {
    return "primary_only";
  }

  return "secondary_only";
}

function calculateConfidence(
  validationStatus: ValidationStatus,
  providers: Provider[],
  secondaryProviders: Provider[],
  score: number,
): number {
  const providerBonus = providers.length * 4;
  const secondaryBonus = secondaryProviders.length * 8;
  const scoreBonus = Math.min(20, score / 20);

  if (validationStatus === "validated") {
    return Math.min(100, Number((70 + providerBonus + secondaryBonus + scoreBonus).toFixed(2)));
  }

  if (validationStatus === "primary_only") {
    return Math.min(89, Number((55 + providerBonus + scoreBonus).toFixed(2)));
  }

  return Math.min(69, Number((40 + secondaryBonus + scoreBonus).toFixed(2)));
}

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

      const providers = [...new Set(bucket.map((item) => item.provider))];
      const sourceTiers = [...new Set(bucket.map((item) => item.sourceTier))];
      const secondaryProviders = [
        ...new Set(
          bucket.filter((item) => item.sourceTier === "secondary").map((item) => item.provider),
        ),
      ];
      const validationStatus = resolveValidationStatus(sourceTiers);
      const confidence = calculateConfidence(validationStatus, providers, secondaryProviders, score);

      return {
        keyword: first.keyword,
        normalizedKeyword: first.normalizedKeyword,
        category: first.category,
        score,
        sampleCount: bucket.length,
        providers,
        sourceTiers,
        bestRank,
        capturedAt: latest,
        secondaryProviders,
        confidence,
        validationStatus,
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

  const validationHighlights = aggregated
    .filter((item) => item.validationStatus === "validated")
    .sort((left, right) => right.confidence - left.confidence || right.score - left.score)
    .slice(0, 10);

  return {
    generatedAt: new Date().toISOString(),
    timezone,
    sections: categories,
    validationHighlights,
    totals: {
      collected: records.length,
      aggregated: aggregated.length,
      categories: categories.filter((section) => section.items.length > 0).length,
      validated: aggregated.filter((item) => item.validationStatus === "validated").length,
      primaryOnly: aggregated.filter((item) => item.validationStatus === "primary_only").length,
      secondaryOnly: aggregated.filter((item) => item.validationStatus === "secondary_only").length,
    },
  };
}
