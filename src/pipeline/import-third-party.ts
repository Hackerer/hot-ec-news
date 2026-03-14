import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { importThirdPartyCsv } from "../importers/third-party-csv.js";
import { buildDailyReport } from "../core/aggregate.js";
import { createDefaultConfig } from "../config/defaults.js";
import { renderMarkdownReport } from "../reports/render-markdown.js";
import { HotwordDatabase } from "../storage/database.js";
import type { Provider } from "../types/hotword.js";
import { createAppPaths, ensureAppDirectories, resolveRootDir } from "../utils/paths.js";

export interface ThirdPartyImportResult {
  imported: number;
  provider: Provider;
  archivePath: string;
}

export function importThirdPartyFile(
  provider: Provider,
  filePath: string,
  explicitRoot?: string,
  capturedAt = new Date().toISOString(),
): ThirdPartyImportResult {
  const rootDir = resolveRootDir(explicitRoot);
  const paths = createAppPaths(rootDir);
  ensureAppDirectories(paths);

  const database = new HotwordDatabase(paths.dbFile);
  database.init();

  const records = importThirdPartyCsv(provider, filePath, capturedAt);
  database.insertHotwords(records);

  const archiveDir = path.join(paths.rawDir, provider, capturedAt.slice(0, 10));
  mkdirSync(archiveDir, { recursive: true });
  const archivePath = path.join(archiveDir, path.basename(filePath));
  copyFileSync(filePath, archivePath);

  return {
    imported: records.length,
    provider,
    archivePath,
  };
}

export function buildValidatedReport(explicitRoot?: string): {
  reportPath: string;
  reportKey: string;
  recordCount: number;
} {
  const rootDir = resolveRootDir(explicitRoot);
  const paths = createAppPaths(rootDir);
  const config = createDefaultConfig();
  ensureAppDirectories(paths);

  const database = new HotwordDatabase(paths.dbFile);
  database.init();

  const latestDate = database.getLatestCollectionDate();
  if (!latestDate) {
    throw new Error("No collected hotwords available to build a validated report.");
  }

  const records = database.listHotwordsByDate(latestDate);
  const report = buildDailyReport(records, config.timezone);
  const reportKey = `validated-${latestDate}`;
  const reportPath = path.join(paths.reportDir, `${reportKey}.md`);

  const markdown = renderMarkdownReport(report);
  writeFileSync(reportPath, markdown, "utf8");
  database.saveReport(reportKey, "markdown", reportPath, report);

  return {
    reportPath,
    reportKey,
    recordCount: records.length,
  };
}
