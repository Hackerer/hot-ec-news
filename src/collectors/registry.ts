import type { AppConfig } from "../config/schema.js";
import type { Provider } from "../types/hotword.js";
import { collectDouyinSuggestions } from "./douyin-suggestions.js";
import { collectJdSuggestions } from "./jd-suggestions.js";
import { collectPinduoduoSuggestions } from "./pinduoduo-suggestions.js";
import { collectTaobaoSuggestions } from "./taobao-suggestions.js";
import { collectXiaohongshuSuggestions } from "./xiaohongshu-suggestions.js";
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
  douyin: {
    provider: "douyin",
    collect: collectDouyinSuggestions,
  },
  xiaohongshu: {
    provider: "xiaohongshu",
    collect: collectXiaohongshuSuggestions,
  },
  pinduoduo: {
    provider: "pinduoduo",
    collect: collectPinduoduoSuggestions,
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
