import { writeFileSync } from "node:fs";
import path from "node:path";

import { allSeeds } from "../config/category-seeds.js";
import { createDefaultConfig } from "../config/defaults.js";
import { buildDailyReport } from "../core/aggregate.js";
import { collectJdSuggestions } from "../collectors/jd-suggestions.js";
import { collectTaobaoSuggestions } from "../collectors/taobao-suggestions.js";
import type { FetchLike } from "../collectors/types.js";
import { renderMarkdownReport } from "../reports/render-markdown.js";
import { HotwordDatabase } from "../storage/database.js";
import { createAppPaths, ensureAppDirectories, resolveRootDir } from "../utils/paths.js";
import { writeRawSnapshot } from "../utils/raw-snapshots.js";

export interface LiveCollectionResult {
  reportPath: string;
  reportKey: string;
  collected: number;
  seeds: string[];
}

export async function runLiveCollection(
  explicitRoot?: string,
  fetchImpl: FetchLike = fetch,
  capturedAt = new Date().toISOString(),
): Promise<LiveCollectionResult> {
  const rootDir = resolveRootDir(explicitRoot);
  const paths = createAppPaths(rootDir);
  const config = createDefaultConfig();

  ensureAppDirectories(paths);

  const database = new HotwordDatabase(paths.dbFile);
  database.init();

  const seeds = allSeeds();
  const collected = [];

  for (const seed of seeds) {
    const taobao = await collectTaobaoSuggestions(seed, fetchImpl, capturedAt);
    writeRawSnapshot(rootDir, taobao.provider, seed, capturedAt, taobao.rawPayload);
    collected.push(...taobao.records);

    const jd = await collectJdSuggestions(seed, fetchImpl, capturedAt);
    writeRawSnapshot(rootDir, jd.provider, seed, capturedAt, jd.rawPayload);
    collected.push(...jd.records);
  }

  database.insertHotwords(collected);
  const report = buildDailyReport(collected, config.timezone);
  const markdown = renderMarkdownReport(report);
  const reportKey = `live-${capturedAt.slice(0, 10)}`;
  const reportPath = path.join(paths.reportDir, `${reportKey}.md`);

  writeFileSync(reportPath, markdown, "utf8");
  database.saveReport(reportKey, "markdown", reportPath, report);

  return {
    reportPath,
    reportKey,
    collected: collected.length,
    seeds,
  };
}
