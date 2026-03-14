import { existsSync } from "node:fs";
import path from "node:path";

import { loadAppConfig } from "../config/load-config.js";
import { getScheduleStatus, type ScheduleStatusResult } from "./manage-schedules.js";
import { HotwordDatabase } from "../storage/database.js";
import type { AppConfig } from "../config/schema.js";
import { getPushChannelStatus, type PushChannelStatus } from "./push-readiness.js";
import { createAppPaths, ensureAppDirectories, resolveRootDir } from "../utils/paths.js";

type RuntimePlatform = NodeJS.Platform;

interface StatusOptions {
  runtimePlatform?: RuntimePlatform;
  homeDir?: string;
  uid?: number;
  execute?: Parameters<typeof getScheduleStatus>[2] extends infer T
    ? T extends { execute?: infer E }
      ? E
      : never
    : never;
}

export interface WorkspaceStatus {
  rootDir: string;
  report: {
    available: boolean;
    reportKey?: string;
    generatedAt?: string;
    path?: string;
    aggregated?: number;
    highConfidence?: number;
    reviewNeeded?: number;
    newEntries?: number;
  };
  lastRun?: {
    runKey: string;
    status: "success" | "failed";
    startedAt: string;
    finishedAt: string;
    importedFiles: string[];
    skippedFiles: string[];
    pushOutputs: string[];
    warnings: string[];
    errorMessage?: string;
  };
  recentRuns: Array<{
    runKey: string;
    status: "success" | "failed";
    startedAt: string;
    importedFiles: string[];
    skippedFiles: string[];
    warnings: string[];
    errorMessage?: string;
  }>;
  sources: {
    primary: string[];
    secondary: string[];
  };
  pushChannels: PushChannelStatus[];
  scheduler: {
    runtimePlatform: RuntimePlatform;
    macosArtifactExists: boolean;
    windowsArtifactExists: boolean;
    runtimeStatus?: ScheduleStatusResult;
  };
}

function buildScheduleStatus(
  rootDir: string,
  config: AppConfig,
  options: StatusOptions,
): WorkspaceStatus["scheduler"] {
  const runtimePlatform = options.runtimePlatform ?? process.platform;
  const paths = createAppPaths(rootDir, config);
  const runtimeStatus =
    runtimePlatform === "darwin"
      ? getScheduleStatus("macos", rootDir, options)
      : runtimePlatform === "win32"
        ? getScheduleStatus("windows", rootDir, options)
        : undefined;

  return {
    runtimePlatform,
    macosArtifactExists: existsSync(path.join(paths.schedulesDir, "hot-ec-news.plist")),
    windowsArtifactExists: existsSync(path.join(paths.schedulesDir, "install-hot-ec-news.ps1")),
    ...(runtimeStatus ? { runtimeStatus } : {}),
  };
}

export function getWorkspaceStatus(
  explicitRoot?: string,
  options: StatusOptions = {},
): WorkspaceStatus {
  const rootDir = resolveRootDir(explicitRoot);
  const config = loadAppConfig(rootDir);
  const paths = createAppPaths(rootDir, config);
  ensureAppDirectories(paths);

  const database = new HotwordDatabase(paths.dbFile);
  database.init();
  const latest = database.getLatestReport();
  const latestRun = database.getLatestPipelineRun();
  const recentRuns = database.listPipelineRuns(5);

  return {
    rootDir,
    report: latest
      ? {
          available: true,
          reportKey: latest.reportKey,
          generatedAt: latest.generatedAt,
          path: latest.path,
          aggregated: latest.summary.totals.aggregated,
          highConfidence: latest.summary.totals.highConfidence,
          reviewNeeded: latest.summary.totals.reviewNeeded,
          newEntries: latest.summary.totals.newEntries,
        }
      : {
          available: false,
        },
    ...(latestRun
      ? {
          lastRun: {
            runKey: latestRun.runKey,
            status: latestRun.status,
            startedAt: latestRun.startedAt,
            finishedAt: latestRun.finishedAt,
            importedFiles: latestRun.importedFiles,
            skippedFiles: latestRun.skippedFiles,
            pushOutputs: latestRun.pushOutputs,
            warnings: latestRun.warnings,
            ...(latestRun.errorMessage ? { errorMessage: latestRun.errorMessage } : {}),
          },
        }
      : {}),
    recentRuns: recentRuns.map((run) => ({
      runKey: run.runKey,
      status: run.status,
      startedAt: run.startedAt,
      importedFiles: run.importedFiles,
      skippedFiles: run.skippedFiles,
      warnings: run.warnings,
      ...(run.errorMessage ? { errorMessage: run.errorMessage } : {}),
    })),
    sources: {
      primary: config.sources
        .filter((source) => source.enabled && source.tier === "primary")
        .map((source) => source.provider),
      secondary: config.sources
        .filter((source) => source.enabled && source.tier === "secondary")
        .map((source) => source.provider),
    },
    pushChannels: config.pushChannels.map((channel) => getPushChannelStatus(channel)),
    scheduler: buildScheduleStatus(rootDir, config, options),
  };
}
