import type {
  AggregatedHotword,
  Category,
  CollectedHotword,
  ConfidenceBand,
  DailyReport,
  Provider,
  ReviewFlag,
  TrendStatus,
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
  primaryProviders: Provider[],
  secondaryProviders: Provider[],
  sampleCount: number,
  score: number,
  hasHistory: boolean,
): number {
  const baseScore =
    validationStatus === "validated" ? 62 : validationStatus === "primary_only" ? 50 : 32;
  const primaryBonus = Math.min(12, primaryProviders.length * 6);
  const secondaryBonus = Math.min(16, secondaryProviders.length * 10);
  const sampleBonus = Math.min(8, sampleCount * 2);
  const historyBonus = hasHistory ? 10 : 0;
  const scoreBonus = Math.min(10, score / 40);

  return Number(
    Math.min(
      100,
      baseScore + primaryBonus + secondaryBonus + sampleBonus + historyBonus + scoreBonus,
    ).toFixed(2),
  );
}

function resolveConfidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 80) {
    return "high";
  }

  if (confidence >= 60) {
    return "medium";
  }

  return "low";
}

function resolveReviewFlags(
  validationStatus: ValidationStatus,
  providers: Provider[],
  trendStatus: TrendStatus,
  confidenceBand: ConfidenceBand,
): ReviewFlag[] {
  const reviewFlags = new Set<ReviewFlag>();

  if (providers.length === 1) {
    reviewFlags.add("single_source");
  }

  if (validationStatus === "secondary_only") {
    reviewFlags.add("secondary_only");
  }

  if (trendStatus === "new" && validationStatus !== "validated") {
    reviewFlags.add("new_unvalidated");
  }

  if (confidenceBand === "low") {
    reviewFlags.add("low_confidence");
  }

  return [...reviewFlags];
}

function resolveTrend(
  currentScore: number,
  previousScore: number | null,
): { status: TrendStatus; previousScore: number | null; deltaScore: number } {
  if (previousScore === null) {
    return {
      status: "new",
      previousScore: null,
      deltaScore: currentScore,
    };
  }

  const deltaScore = Number((currentScore - previousScore).toFixed(2));
  if (Math.abs(deltaScore) < 0.01) {
    return {
      status: "steady",
      previousScore,
      deltaScore: 0,
    };
  }

  return {
    status: deltaScore > 0 ? "up" : "down",
    previousScore,
    deltaScore,
  };
}

type AggregatedWindowItem = Omit<
  AggregatedHotword,
  "confidence" | "confidenceBand" | "trend" | "reviewFlags"
>;

function aggregateCurrentWindow(records: CollectedHotword[]): AggregatedWindowItem[] {
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
      const primaryProviders = [
        ...new Set(bucket.filter((item) => item.sourceTier === "primary").map((item) => item.provider)),
      ];
      const sourceTiers = [...new Set(bucket.map((item) => item.sourceTier))];
      const secondaryProviders = [
        ...new Set(
          bucket.filter((item) => item.sourceTier === "secondary").map((item) => item.provider),
        ),
      ];
      const validationStatus = resolveValidationStatus(sourceTiers);

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
        validationStatus,
      } satisfies AggregatedWindowItem;
    })
    .sort((left, right) => right.score - left.score || left.bestRank - right.bestRank);
}

export function aggregateHotwords(
  records: CollectedHotword[],
  previousRecords: CollectedHotword[] = [],
): AggregatedHotword[] {
  const previousScores = new Map(
    aggregateCurrentWindow(previousRecords).map((item) => [item.normalizedKeyword, item.score]),
  );

  return aggregateCurrentWindow(records)
    .map((item) => {
      const previousScore = previousScores.get(item.normalizedKeyword) ?? null;
      const trend = resolveTrend(item.score, previousScore);
      const primaryProviders = item.providers.filter((provider) => !item.secondaryProviders.includes(provider));
      const confidence = calculateConfidence(
        item.validationStatus,
        primaryProviders,
        item.secondaryProviders,
        item.sampleCount,
        item.score,
        previousScore !== null,
      );
      const confidenceBand = resolveConfidenceBand(confidence);
      const reviewFlags = resolveReviewFlags(
        item.validationStatus,
        item.providers,
        trend.status,
        confidenceBand,
      );

      return {
        ...item,
        confidence,
        confidenceBand,
        trend,
        reviewFlags,
      } satisfies AggregatedHotword;
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.confidence - left.confidence ||
        left.bestRank - right.bestRank,
    );
}

export function buildDailyReport(
  records: CollectedHotword[],
  timezone: string,
  warnings: string[] = [],
  previousRecords: CollectedHotword[] = [],
  selectedCategories: Exclude<Category, "unknown">[] = ["apparel", "shoes", "jewelry"],
): DailyReport {
  const allowedCategories = new Set(selectedCategories);
  const filteredRecords = records.filter(
    (record): record is CollectedHotword =>
      record.category !== "unknown" && allowedCategories.has(record.category),
  );
  const filteredPreviousRecords = previousRecords.filter(
    (record): record is CollectedHotword =>
      record.category !== "unknown" && allowedCategories.has(record.category),
  );
  const aggregated = aggregateHotwords(filteredRecords, filteredPreviousRecords);
  const categories: DailyReport["sections"] = selectedCategories.map(
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

  const confidenceHighlights = aggregated
    .filter((item) => item.confidenceBand === "high")
    .sort((left, right) => right.confidence - left.confidence || right.score - left.score)
    .slice(0, 10);

  const reviewHighlights = aggregated
    .filter((item) => item.reviewFlags.length > 0)
    .sort(
      (left, right) =>
        right.reviewFlags.length - left.reviewFlags.length ||
        left.confidence - right.confidence ||
        right.score - left.score,
    )
    .slice(0, 10);

  const newHighlights = aggregated
    .filter((item) => item.trend.status === "new")
    .sort((left, right) => right.score - left.score || left.bestRank - right.bestRank)
    .slice(0, 10);

  const repeatedHighlights = aggregated
    .filter((item) => item.trend.status !== "new")
    .sort((left, right) => right.trend.deltaScore - left.trend.deltaScore || right.score - left.score)
    .slice(0, 10);

  return {
    generatedAt: new Date().toISOString(),
    timezone,
    sections: categories,
    validationHighlights,
    confidenceHighlights,
    reviewHighlights,
    newHighlights,
    repeatedHighlights,
    warnings,
    totals: {
      collected: filteredRecords.length,
      aggregated: aggregated.length,
      categories: categories.filter((section) => section.items.length > 0).length,
      validated: aggregated.filter((item) => item.validationStatus === "validated").length,
      primaryOnly: aggregated.filter((item) => item.validationStatus === "primary_only").length,
      secondaryOnly: aggregated.filter((item) => item.validationStatus === "secondary_only").length,
      newEntries: aggregated.filter((item) => item.trend.status === "new").length,
      repeatedEntries: aggregated.filter((item) => item.trend.status !== "new").length,
      highConfidence: aggregated.filter((item) => item.confidenceBand === "high").length,
      mediumConfidence: aggregated.filter((item) => item.confidenceBand === "medium").length,
      lowConfidence: aggregated.filter((item) => item.confidenceBand === "low").length,
      reviewNeeded: aggregated.filter((item) => item.reviewFlags.length > 0).length,
    },
  };
}
