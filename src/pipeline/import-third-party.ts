import { copyFileSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

import { buildDailyReport } from "../core/aggregate.js";
import { loadAppConfig } from "../config/load-config.js";
import { importThirdPartyCsv } from "../importers/third-party-csv.js";
import { renderMarkdownReport } from "../reports/render-markdown.js";
import { HotwordDatabase } from "../storage/database.js";
import type { Provider } from "../types/hotword.js";
import { createAppPaths, ensureAppDirectories, resolveRootDir } from "../utils/paths.js";

export interface ThirdPartyImportResult {
  imported: number;
  provider: Provider;
  archivePath: string;
  fileHash: string;
  fileName: string;
  fileSize: number;
}

export function buildImportFileFingerprint(filePath: string): { fileHash: string; fileSize: number } {
  const source = statSync(filePath);
  const hash = createHash("sha1").update(path.basename(filePath)).update(String(source.size)).update(String(source.mtimeMs)).digest("hex");
  return {
    fileHash: hash,
    fileSize: source.size,
  };
}

export function importThirdPartyFile(
  provider: Provider,
  filePath: string,
  explicitRoot?: string,
  capturedAt = new Date().toISOString(),
): ThirdPartyImportResult {
  const rootDir = resolveRootDir(explicitRoot);
  const config = loadAppConfig(rootDir);
  const paths = createAppPaths(rootDir, config);
  ensureAppDirectories(paths);

  const database = new HotwordDatabase(paths.dbFile);
  database.init();

  const records = importThirdPartyCsv(provider, filePath, capturedAt);
  database.deleteHotwordsForDate(capturedAt.slice(0, 10), {
    provider,
    sourceTier: "secondary",
    sourceKind: "third_party",
  });
  database.insertHotwords(records);

  const archiveDir = path.join(paths.rawDir, provider, capturedAt.slice(0, 10));
  mkdirSync(archiveDir, { recursive: true });
  const archivePath = path.join(archiveDir, path.basename(filePath));
  copyFileSync(filePath, archivePath);
  const { fileHash, fileSize } = buildImportFileFingerprint(filePath);
  const fileName = path.basename(filePath);
  database.saveProcessedImport({
    provider,
    fileName,
    fileHash,
    fileSize,
    processedAt: capturedAt,
    archivePath,
  });

  return {
    imported: records.length,
    provider,
    archivePath,
    fileHash,
    fileName,
    fileSize,
  };
}

export function buildValidatedReport(explicitRoot?: string, warnings?: string[]): {
  reportPath: string;
  reportKey: string;
  recordCount: number;
} {
  const rootDir = resolveRootDir(explicitRoot);
  const config = loadAppConfig(rootDir);
  const paths = createAppPaths(rootDir, config);
  ensureAppDirectories(paths);

  const database = new HotwordDatabase(paths.dbFile);
  database.init();

  const latestDate = database.getLatestCollectionDate({
    excludeSourceKinds: ["fixture"],
  });
  if (!latestDate) {
    throw new Error("No collected hotwords available to build a validated report.");
  }

  const records = database.listHotwordsByDate(latestDate, {
    excludeSourceKinds: ["fixture"],
  });
  const previousDate = database.getPreviousCollectionDate(latestDate, {
    excludeSourceKinds: ["fixture"],
  });
  const previousRecords = previousDate
    ? database.listHotwordsByDate(previousDate, {
        excludeSourceKinds: ["fixture"],
      })
    : [];
  const report = buildDailyReport(
    records,
    config.timezone,
    warnings ?? [],
    previousRecords,
    config.categories,
  );
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
