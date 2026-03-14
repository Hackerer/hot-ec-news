import { categorizeKeyword, normalizeKeyword } from "../core/categorize.js";
import type { CollectedHotword } from "../types/hotword.js";

const fixtureRows = [
  ["taobao", "连衣裙女夏", 1, 96, "primary"],
  ["taobao", "防晒衣女", 2, 92, "primary"],
  ["taobao", "老爹鞋女", 3, 88, "primary"],
  ["jd", "运动鞋男", 1, 94, "primary"],
  ["jd", "短靴女", 2, 89, "primary"],
  ["jd", "珍珠项链", 3, 86, "primary"],
  ["chanmama", "防晒衣女", 4, 81, "secondary"],
  ["chanmama", "耳钉高级感", 5, 78, "secondary"],
  ["chanmama", "连衣裙女夏", 6, 76, "secondary"],
] as const;

export function getFixtureHotwords(capturedAt = "2026-03-14T09:00:00+08:00"): CollectedHotword[] {
  return fixtureRows.map(([provider, keyword, rank, score, tier]) => ({
    provider: provider as CollectedHotword["provider"],
    sourceTier: tier as CollectedHotword["sourceTier"],
    sourceKind: "fixture",
    keyword,
    normalizedKeyword: normalizeKeyword(keyword),
    category: categorizeKeyword(keyword),
    rank,
    scoreRaw: score,
    scoreNormalized: score,
    capturedAt,
    metadata: {
      fixture: true,
    },
  }));
}
