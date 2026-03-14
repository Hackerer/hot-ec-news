import { readFileSync } from "node:fs";

import { parse } from "csv-parse/sync";

import { categorizeKeyword, normalizeKeyword } from "../core/categorize.js";
import type { CollectedHotword, Provider } from "../types/hotword.js";
import { normalizeRankScore } from "../collectors/scoring.js";

type Row = Record<string, string>;

const headerCandidates = {
  keyword: ["keyword", "关键词", "搜索词", "热词"],
  rank: ["rank", "排名", "排序"],
  score: ["score", "指数", "热度", "热词指数", "hot_score"],
  category: ["category", "类目", "分类"],
};

function getValue(row: Row, candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    const hit = row[candidate];
    if (hit !== undefined && hit !== "") {
      return hit;
    }
  }
  return undefined;
}

function parseRows(filePath: string): Row[] {
  const source = readFileSync(filePath, "utf8");
  return parse(source, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as Row[];
}

export function importThirdPartyCsv(
  provider: Provider,
  filePath: string,
  capturedAt = new Date().toISOString(),
): CollectedHotword[] {
  const rows = parseRows(filePath);

  return rows
    .map((row, index) => {
      const keyword = getValue(row, headerCandidates.keyword)?.trim();
      if (!keyword) {
        return null;
      }

      const categoryHint = getValue(row, headerCandidates.category)?.trim();
      const rankValue = Number(getValue(row, headerCandidates.rank) ?? index + 1);
      const scoreValue = getValue(row, headerCandidates.score);
      const parsedScore = scoreValue ? Number(scoreValue) : undefined;
      const normalizedCategoryHint = categoryHint ? normalizeKeyword(categoryHint) : undefined;
      const category = normalizedCategoryHint
        ? normalizedCategoryHint.includes("服")
          ? "apparel"
          : normalizedCategoryHint.includes("鞋")
            ? "shoes"
            : normalizedCategoryHint.includes("饰")
              ? "jewelry"
              : categorizeKeyword(keyword)
        : categorizeKeyword(keyword);

      const record: CollectedHotword = {
        provider,
        sourceTier: "secondary",
        sourceKind: "third_party",
        keyword,
        normalizedKeyword: normalizeKeyword(keyword),
        category,
        rank: rankValue,
        scoreNormalized:
          parsedScore && Number.isFinite(parsedScore)
            ? Math.min(100, Math.max(10, Number((Math.log10(parsedScore + 1) * 22).toFixed(2))))
            : normalizeRankScore(rankValue, rows.length),
        capturedAt,
        metadata: {
          importedFrom: filePath,
        },
      };

      if (parsedScore && Number.isFinite(parsedScore)) {
        record.scoreRaw = parsedScore;
      }

      return record;
    })
    .filter((item): item is CollectedHotword => Boolean(item));
}
