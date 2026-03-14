import { categorizeKeyword, normalizeKeyword } from "../core/categorize.js";
import type { CollectedHotword } from "../types/hotword.js";
import type { CollectorOutput, FetchLike } from "./types.js";
import { normalizeRankScore } from "./scoring.js";

interface JdSuggestionItem {
  keyword?: string;
}

export async function collectJdSuggestions(
  seed: string,
  fetchImpl: FetchLike = fetch,
  capturedAt = new Date().toISOString(),
): Promise<CollectorOutput> {
  const requestUrl = `https://dd-search.jd.com/?key=${encodeURIComponent(seed)}&terminal=pc`;
  const response = await fetchImpl(requestUrl, {
    headers: {
      "user-agent": "hot-ec-news/0.2.0",
    },
  });

  if (!response.ok) {
    throw new Error(`JD collector failed with status ${response.status}`);
  }

  const rawPayload = await response.text();
  const payload = JSON.parse(rawPayload) as JdSuggestionItem[];
  const rows = Array.isArray(payload) ? payload : [];

  const records: CollectedHotword[] = rows
    .map((item) => item.keyword?.trim())
    .filter((keyword): keyword is string => Boolean(keyword))
    .map((keyword, index, items) => ({
      provider: "jd",
      sourceTier: "primary",
      sourceKind: "platform_suggestions",
      keyword,
      normalizedKeyword: normalizeKeyword(keyword),
      category: categorizeKeyword(keyword),
      rank: index + 1,
      scoreNormalized: normalizeRankScore(index + 1, items.length),
      capturedAt,
      querySeed: seed,
    }));

  return {
    provider: "jd",
    seed,
    requestUrl,
    records,
    rawPayload,
  };
}
