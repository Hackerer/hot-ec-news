import type { AppConfig } from "../config/schema.js";
import type { Provider } from "../types/hotword.js";
import { collectJdSuggestions } from "./jd-suggestions.js";
import { collectTaobaoSuggestions } from "./taobao-suggestions.js";
import type { CollectorOutput, FetchLike } from "./types.js";

export interface LiveCollectorDefinition {
  provider: Provider;
  collect: (seed: string, fetchImpl: FetchLike, capturedAt: string) => Promise<CollectorOutput>;
}

const liveCollectors: Record<string, LiveCollectorDefinition> = {
  taobao: {
    provider: "taobao",
    collect: collectTaobaoSuggestions,
  },
  jd: {
    provider: "jd",
    collect: collectJdSuggestions,
  },
};

export function listEnabledLiveCollectors(config: AppConfig): LiveCollectorDefinition[] {
  return config.sources
    .filter((source) => source.enabled && source.tier === "primary" && source.kind === "platform_suggestions")
    .map((source) => liveCollectors[source.provider])
    .filter((collector): collector is LiveCollectorDefinition => Boolean(collector));
}
