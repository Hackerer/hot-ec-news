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
  const paths = createAppPaths(rootDir);
  const config = createDefaultConfig();

  ensureAppDirectories(paths);

  const database = new HotwordDatabase(paths.dbFile);
  database.init();

  const enabledProviders = new Set(
    (process.env.HOT_EC_NEWS_ENABLED_PROVIDERS ?? "taobao,jd")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const seeds = allSeeds();
  const collected = [];
  const warnings: string[] = [];

  for (const seed of seeds) {
    if (enabledProviders.has("taobao")) {
      try {
        const taobao = await withRetries(
          () => collectTaobaoSuggestions(seed, fetchImpl, capturedAt),
          2,
        );
        writeRawSnapshot(rootDir, taobao.provider, seed, capturedAt, taobao.rawPayload);
        collected.push(...taobao.records);
      } catch (error) {
        const snapshotPath = writeErrorSnapshot(rootDir, "taobao", seed, capturedAt, error);
        warnings.push(`淘宝采集失败：${seed}，错误快照 ${snapshotPath}`);
      }
    }

    if (enabledProviders.has("jd")) {
      try {
        const jd = await withRetries(() => collectJdSuggestions(seed, fetchImpl, capturedAt), 2);
        writeRawSnapshot(rootDir, jd.provider, seed, capturedAt, jd.rawPayload);
        collected.push(...jd.records);
      } catch (error) {
        const snapshotPath = writeErrorSnapshot(rootDir, "jd", seed, capturedAt, error);
        warnings.push(`京东采集失败：${seed}，错误快照 ${snapshotPath}`);
      }
    }
  }

  if (collected.length === 0) {
    throw new Error("All enabled live collectors failed.");
  }

  database.insertHotwords(collected);
  const report = buildDailyReport(collected, config.timezone, warnings);
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
