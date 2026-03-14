import { categorizeKeyword, normalizeKeyword } from "../core/categorize.js";
import type { CollectedHotword } from "../types/hotword.js";
import type { CollectorOutput, FetchLike } from "./types.js";
import { normalizeTaobaoScore } from "./scoring.js";

interface TaobaoSuggestionResponse {
  result?: Array<[string, string]>;
  tmall?: string;
}

export async function collectTaobaoSuggestions(
  seed: string,
  fetchImpl: FetchLike = fetch,
  capturedAt = new Date().toISOString(),
): Promise<CollectorOutput> {
  const requestUrl = `https://suggest.taobao.com/sug?code=utf-8&q=${encodeURIComponent(seed)}`;
  const response = await fetchImpl(requestUrl, {
    headers: {
      "user-agent": "hot-ec-news/0.2.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Taobao collector failed with status ${response.status}`);
  }

  const rawPayload = await response.text();
  const payload = JSON.parse(rawPayload) as TaobaoSuggestionResponse;
  const rows = Array.isArray(payload.result) ? payload.result : [];

  const records: CollectedHotword[] = rows.map(([keyword, rawScore], index) => ({
    provider: "taobao",
    sourceTier: "primary",
    sourceKind: "platform_suggestions",
    keyword,
    normalizedKeyword: normalizeKeyword(keyword),
    category: categorizeKeyword(keyword),
    rank: index + 1,
    scoreRaw: Number(rawScore),
    scoreNormalized: normalizeTaobaoScore(Number(rawScore), index + 1),
    capturedAt,
    querySeed: seed,
    metadata: {
      tmall: payload.tmall ?? null,
    },
  }));

  return {
    provider: "taobao",
    seed,
    requestUrl,
    records,
    rawPayload,
  };
}
