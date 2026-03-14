import { readdirSync } from "node:fs";
import path from "node:path";

import { loadAppConfig } from "../config/load-config.js";
import { inferThirdPartyProvider, isEnabledThirdPartyProvider } from "../importers/registry.js";
import { buildImportFileFingerprint, buildValidatedReport, importThirdPartyFile } from "./import-third-party.js";
import { pushConfiguredChannels } from "../pushers/registry.js";
import { runLiveCollection } from "./run-live-collection.js";
import type { FetchLike } from "../collectors/types.js";
import { HotwordDatabase } from "../storage/database.js";
import { createAppPaths, ensureAppDirectories, resolveRootDir } from "../utils/paths.js";

export async function runDailyPipeline(
  explicitRoot?: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ reportPath: string; importedFiles: string[]; skippedFiles: string[]; pushOutputs: string[] }> {
  const startedAt = new Date().toISOString();
  const runKey = `run-daily-${startedAt}`;
  const rootDir = resolveRootDir(explicitRoot);
  const config = loadAppConfig(rootDir);
  const paths = createAppPaths(rootDir, config);
  ensureAppDirectories(paths);
  const database = new HotwordDatabase(paths.dbFile);
  database.init();
  const importedFiles: string[] = [];
  const skippedFiles: string[] = [];
  const pushOutputs: string[] = [];
  const warnings: string[] = [];
  let reportPath = "";

  try {
    const liveResult = await runLiveCollection(rootDir, fetchImpl);
    warnings.push(...liveResult.warnings);

    for (const fileName of readdirSync(paths.importsDir)) {
      if (!fileName.endsWith(".csv")) {
        continue;
      }

      const provider = inferThirdPartyProvider(fileName);
      if (!provider) {
        continue;
      }
      if (!isEnabledThirdPartyProvider(provider, config)) {
        continue;
      }

      const filePath = path.join(paths.importsDir, fileName);
      const { fileHash } = buildImportFileFingerprint(filePath);
      if (database.hasProcessedImport(provider, fileName, fileHash)) {
        skippedFiles.push(fileName);
        continue;
      }

      importThirdPartyFile(provider, filePath, rootDir);
      importedFiles.push(fileName);
    }

    const result = buildValidatedReport(rootDir, warnings);
    reportPath = result.reportPath;
    if (config.autoPushOnDaily) {
      pushOutputs.push(...(await pushConfiguredChannels(config, rootDir)));
    }

    database.savePipelineRun({
      runKey,
      command: "run:daily",
      status: "success",
      startedAt,
      finishedAt: new Date().toISOString(),
      warnings,
      importedFiles,
      skippedFiles,
      pushOutputs,
      reportPath,
    });

    return {
      reportPath,
      importedFiles,
      skippedFiles,
      pushOutputs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    database.savePipelineRun({
      runKey,
      command: "run:daily",
      status: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      warnings,
      importedFiles,
      skippedFiles,
      pushOutputs,
      ...(reportPath ? { reportPath } : {}),
      errorMessage: message,
    });
    throw error;
  }
}
