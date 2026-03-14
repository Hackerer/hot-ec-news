import { categorizeKeyword, normalizeKeyword } from "../core/categorize.js";
import type { CollectedHotword } from "../types/hotword.js";
import type { CollectorOutput, FetchLike } from "./types.js";
import { normalizeRankScore } from "./scoring.js";

interface PinduoduoQueryItem {
  q?: string;
  q_search?: string;
}

interface PinduoduoSuggestionResponse {
  hotqs?: PinduoduoQueryItem[];
  hotqs_sug?: PinduoduoQueryItem[];
  req_id?: string;
  matchQuery?: string;
}

function extractKeyword(item: PinduoduoQueryItem): string | null {
  for (const candidate of [item.q, item.q_search]) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

export async function collectPinduoduoSuggestions(
  seed: string,
  fetchImpl: FetchLike = fetch,
  capturedAt = new Date().toISOString(),
): Promise<CollectorOutput> {
  const requestUrl = `https://mobile.yangkeduo.com/api/search/guess_query?query=${encodeURIComponent(seed)}&rn=10`;
  const cookie = process.env.PINDUODUO_COOKIE?.trim();
  const response = await fetchImpl(requestUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 hot-ec-news/0.16.0",
      referer: `https://mobile.yangkeduo.com/search_result.html?search_key=${encodeURIComponent(seed)}`,
      ...(cookie ? { cookie } : {}),
    },
    redirect: "manual",
  });

  const rawPayload = await response.text();
  if (response.status >= 300 && response.status < 400) {
    return {
      provider: "pinduoduo",
      seed,
      requestUrl,
      records: [],
      rawPayload,
    };
  }

  if (!response.ok) {
    throw new Error(`Pinduoduo collector failed with status ${response.status}`);
  }

  const payload = JSON.parse(rawPayload) as PinduoduoSuggestionResponse;
  const seen = new Set<string>();
  const keywords = [...(payload.hotqs ?? []), ...(payload.hotqs_sug ?? [])]
    .map((item) => extractKeyword(item))
    .filter((keyword): keyword is string => Boolean(keyword))
    .filter((keyword) => {
      const normalized = normalizeKeyword(keyword);
      if (seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    });

  const records: CollectedHotword[] = keywords.map((keyword, index, items) => ({
    provider: "pinduoduo",
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
      requestId: payload.req_id ?? null,
      matchQuery: payload.matchQuery ?? null,
    },
  }));

  return {
    provider: "pinduoduo",
    seed,
    requestUrl,
    records,
    rawPayload,
  };
}
