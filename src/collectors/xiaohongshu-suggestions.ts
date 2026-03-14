import { categorizeKeyword, normalizeKeyword } from "../core/categorize.js";
import type { CollectedHotword } from "../types/hotword.js";
import type { CollectorOutput, FetchLike } from "./types.js";
import { normalizeRankScore } from "./scoring.js";

type UnknownRecord = Record<string, unknown>;

interface XiaohongshuSuggestionResponse {
  code?: number;
  success?: boolean;
  msg?: string;
  data?: unknown;
}

function keywordFromUnknown(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as UnknownRecord;
  for (const field of [
    "search_word",
    "keyword",
    "word",
    "query",
    "text",
    "title",
    "name",
    "highlight_word",
  ]) {
    const candidate = record[field];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function collectKeywordCandidates(payload: XiaohongshuSuggestionResponse): string[] {
  const data = payload.data;
  const candidateArrays: unknown[] = [];

  if (Array.isArray(data)) {
    candidateArrays.push(data);
  } else if (data && typeof data === "object") {
    const record = data as UnknownRecord;
    for (const field of [
      "items",
      "list",
      "queries",
      "hint_words",
      "suggestion_words",
      "search_recommend_words",
      "words",
    ]) {
      candidateArrays.push(record[field]);
    }
  }

  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const candidateArray of candidateArrays) {
    if (!Array.isArray(candidateArray)) {
      continue;
    }

    for (const item of candidateArray) {
      const keyword = keywordFromUnknown(item);
      if (!keyword) {
        continue;
      }

      const normalized = normalizeKeyword(keyword);
      if (seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      keywords.push(keyword);
    }
  }

  return keywords;
}

export async function collectXiaohongshuSuggestions(
  seed: string,
  fetchImpl: FetchLike = fetch,
  capturedAt = new Date().toISOString(),
): Promise<CollectorOutput> {
  const requestUrl = `https://edith.xiaohongshu.com/api/sns/web/v1/search/recommend?keyword=${encodeURIComponent(seed)}`;
  const cookie = process.env.XIAOHONGSHU_COOKIE?.trim();
  const response = await fetchImpl(requestUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 hot-ec-news/0.16.0",
      referer: `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(seed)}&source=web_explore_feed`,
      ...(cookie ? { cookie } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Xiaohongshu collector failed with status ${response.status}`);
  }

  const rawPayload = await response.text();
  const payload = JSON.parse(rawPayload) as XiaohongshuSuggestionResponse;
  const keywords = collectKeywordCandidates(payload);
  const records: CollectedHotword[] = keywords.map((keyword, index, items) => ({
    provider: "xiaohongshu",
    sourceTier: "primary",
    sourceKind: "platform_suggestions",
    keyword,
    normalizedKeyword: normalizeKeyword(keyword),
    category: categorizeKeyword(keyword),
    rank: index + 1,
    scoreNormalized: normalizeRankScore(index + 1, items.length || 10),
    capturedAt,
    querySeed: seed,
    metadata: {
      code: payload.code ?? null,
      success: payload.success ?? null,
      message: payload.msg ?? null,
      authRequired: payload.code === -101,
    },
  }));

  return {
    provider: "xiaohongshu",
    seed,
    requestUrl,
    records,
    rawPayload,
  };
}
