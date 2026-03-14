import { categorizeKeyword, normalizeKeyword } from "../core/categorize.js";
import type { CollectedHotword } from "../types/hotword.js";
import type { CollectorOutput, FetchLike } from "./types.js";
import { normalizeRankScore } from "./scoring.js";

interface DouyinSuggestionItem {
  word?: string;
  keyword?: string;
  search_word?: string;
  words?: string;
  hot_value?: number | string;
  word_type?: string;
  sentence_tag?: string;
}

interface DouyinSuggestionResponse {
  data?: DouyinSuggestionItem[];
}

function resolveKeyword(item: DouyinSuggestionItem): string | null {
  for (const candidate of [item.word, item.keyword, item.search_word, item.words]) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

export async function collectDouyinSuggestions(
  seed: string,
  fetchImpl: FetchLike = fetch,
  capturedAt = new Date().toISOString(),
): Promise<CollectorOutput> {
  const requestUrl = `https://www.douyin.com/aweme/v1/web/api/suggest_words/?keyword=${encodeURIComponent(seed)}`;
  const response = await fetchImpl(requestUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 hot-ec-news/0.16.0",
      referer: "https://www.douyin.com/",
    },
  });

  if (!response.ok) {
    throw new Error(`Douyin collector failed with status ${response.status}`);
  }

  const rawPayload = await response.text();
  const payload = JSON.parse(rawPayload) as DouyinSuggestionResponse;
  const rows = Array.isArray(payload.data) ? payload.data : [];
  const keywords = rows
    .map((item) => ({
      keyword: resolveKeyword(item),
      hotValue: Number(item.hot_value ?? 0),
      metadata: {
        wordType: item.word_type ?? null,
        sentenceTag: item.sentence_tag ?? null,
      },
    }))
    .filter((item): item is NonNullable<typeof item> & { keyword: string } => Boolean(item.keyword));

  const records: CollectedHotword[] = keywords.map((item, index, items) => ({
    provider: "douyin",
    sourceTier: "primary",
    sourceKind: "platform_suggestions",
    keyword: item.keyword,
    normalizedKeyword: normalizeKeyword(item.keyword),
    category: categorizeKeyword(item.keyword),
    rank: index + 1,
    scoreNormalized: normalizeRankScore(index + 1, items.length || 10),
    capturedAt,
    querySeed: seed,
    metadata: item.metadata,
    ...(Number.isFinite(item.hotValue) && item.hotValue > 0 ? { scoreRaw: item.hotValue } : {}),
  }));

  return {
    provider: "douyin",
    seed,
    requestUrl,
    records,
    rawPayload,
  };
}
