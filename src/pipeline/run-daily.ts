import { readdirSync } from "node:fs";
import path from "node:path";

import { loadAppConfig } from "../config/load-config.js";
import { inferThirdPartyProvider, isEnabledThirdPartyProvider } from "../importers/registry.js";
import { buildValidatedReport, importThirdPartyFile } from "./import-third-party.js";
import { pushConfiguredChannels } from "../pushers/registry.js";
import { runLiveCollection } from "./run-live-collection.js";
import type { FetchLike } from "../collectors/types.js";
import { createAppPaths, ensureAppDirectories, resolveRootDir } from "../utils/paths.js";

export async function runDailyPipeline(
  explicitRoot?: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ reportPath: string; importedFiles: string[]; pushOutputs: string[] }> {
  const rootDir = resolveRootDir(explicitRoot);
  const config = loadAppConfig(rootDir);
  const paths = createAppPaths(rootDir, config);
  ensureAppDirectories(paths);

  const liveResult = await runLiveCollection(rootDir, fetchImpl);

  const importedFiles: string[] = [];
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

    importThirdPartyFile(provider, path.join(paths.importsDir, fileName), rootDir);
    importedFiles.push(fileName);
  }

  const result = buildValidatedReport(rootDir, liveResult.warnings);
  const pushOutputs = config.autoPushOnDaily
    ? await pushConfiguredChannels(config, rootDir)
    : [];
  return {
    reportPath: result.reportPath,
    importedFiles,
    pushOutputs,
  };
}
