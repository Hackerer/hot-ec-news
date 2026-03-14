import { writeFileSync } from "node:fs";
import path from "node:path";

import { seedsFromConfig } from "../config/category-seeds.js";
import { loadAppConfig } from "../config/load-config.js";
import { buildDailyReport } from "../core/aggregate.js";
import { listEnabledLiveCollectors } from "../collectors/registry.js";
import type { FetchLike } from "../collectors/types.js";
import { renderMarkdownReport } from "../reports/render-markdown.js";
import { HotwordDatabase } from "../storage/database.js";
import { writeErrorSnapshot } from "../utils/error-snapshots.js";
import { createAppPaths, ensureAppDirectories, resolveRootDir } from "../utils/paths.js";
import { writeRawSnapshot } from "../utils/raw-snapshots.js";
import { withRetries } from "../utils/retry.js";

export interface LiveCollectionResult {
  reportPath: string;
  reportKey: string;
  collected: number;
  seeds: string[];
  warnings: string[];
}

export async function runLiveCollection(
  explicitRoot?: string,
  fetchImpl: FetchLike = fetch,
  capturedAt = new Date().toISOString(),
): Promise<LiveCollectionResult> {
  const rootDir = resolveRootDir(explicitRoot);
  const config = loadAppConfig(rootDir);
  const paths = createAppPaths(rootDir, config);

  ensureAppDirectories(paths);

  const database = new HotwordDatabase(paths.dbFile);
  database.init();

  const seeds = seedsFromConfig(config);
  const collectors = listEnabledLiveCollectors(config);
  const collected = [];
  const warnings: string[] = [];

  for (const seed of seeds) {
    for (const collector of collectors) {
      try {
        const result = await withRetries(() => collector.collect(seed, fetchImpl, capturedAt), 2);
        writeRawSnapshot(rootDir, result.provider, seed, capturedAt, result.rawPayload);
        collected.push(...result.records);
      } catch (error) {
        const snapshotPath = writeErrorSnapshot(rootDir, collector.provider, seed, capturedAt, error);
        warnings.push(`${collector.provider} 采集失败：${seed}，错误快照 ${snapshotPath}`);
      }
    }
  }

  if (collected.length === 0) {
    throw new Error("All enabled live collectors failed.");
  }

  database.deleteHotwordsForDate(capturedAt.slice(0, 10), {
    sourceTier: "primary",
    sourceKind: "platform_suggestions",
  });
  database.insertHotwords(collected);
  const report = buildDailyReport(collected, config.timezone, warnings, [], config.categories);
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
    warnings,
  };
}
