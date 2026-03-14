export type Category = "apparel" | "shoes" | "jewelry" | "unknown";

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
  | "manual";

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
  totals: {
    collected: number;
    aggregated: number;
    categories: number;
  };
}
