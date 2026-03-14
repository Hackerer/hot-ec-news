export type Category = "apparel" | "shoes" | "jewelry" | "unknown";
export const reportableCategories = ["apparel", "shoes", "jewelry"] as const satisfies readonly Exclude<
  Category,
  "unknown"
>[];

export type SourceTier = "primary" | "secondary";

export type SourceKind =
  | "platform_suggestions"
  | "third_party"
  | "fixture"
  | "manual";

export type Provider =
  | "taobao"
  | "jd"
  | "douyin"
  | "chanmama"
  | "feigua"
  | "qiangua"
  | "magicmirror"
  | "manual";

export const providerValues = [
  "taobao",
  "jd",
  "douyin",
  "chanmama",
  "feigua",
  "qiangua",
  "magicmirror",
  "manual",
] as const satisfies readonly Provider[];

export type ValidationStatus = "validated" | "primary_only" | "secondary_only";
export type TrendStatus = "new" | "up" | "down" | "steady";
export type ConfidenceBand = "high" | "medium" | "low";
export type ReviewFlag =
  | "single_source"
  | "secondary_only"
  | "new_unvalidated"
  | "low_confidence";

export interface CollectedHotword {
  provider: Provider;
  sourceTier: SourceTier;
  sourceKind: SourceKind;
  keyword: string;
  normalizedKeyword: string;
  category: Category;
  rank: number;
  scoreRaw?: number;
  scoreNormalized: number;
  capturedAt: string;
  querySeed?: string;
  metadata?: Record<string, unknown>;
}

export interface AggregatedHotword {
  keyword: string;
  normalizedKeyword: string;
  category: Category;
  score: number;
  sampleCount: number;
  providers: Provider[];
  sourceTiers: SourceTier[];
  bestRank: number;
  capturedAt: string;
  secondaryProviders: Provider[];
  confidence: number;
  confidenceBand: ConfidenceBand;
  validationStatus: ValidationStatus;
  trend: {
    status: TrendStatus;
    previousScore: number | null;
    deltaScore: number;
  };
  reviewFlags: ReviewFlag[];
}

export interface CategorySection {
  category: Category;
  title: string;
  items: AggregatedHotword[];
}

export interface DailyReport {
  generatedAt: string;
  timezone: string;
  sections: CategorySection[];
  validationHighlights: AggregatedHotword[];
  confidenceHighlights: AggregatedHotword[];
  reviewHighlights: AggregatedHotword[];
  newHighlights: AggregatedHotword[];
  repeatedHighlights: AggregatedHotword[];
  warnings: string[];
  totals: {
    collected: number;
    aggregated: number;
    categories: number;
    validated: number;
    primaryOnly: number;
    secondaryOnly: number;
    newEntries: number;
    repeatedEntries: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    reviewNeeded: number;
  };
}
