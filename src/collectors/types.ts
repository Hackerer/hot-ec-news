import type { CollectedHotword } from "../types/hotword.js";

export type FetchLike = typeof fetch;

export interface CollectorOutput {
  provider: CollectedHotword["provider"];
  seed: string;
  requestUrl: string;
  records: CollectedHotword[];
  rawPayload: string;
}
