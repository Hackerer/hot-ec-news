import { existsSync } from "node:fs";
import path from "node:path";

import { loadAppConfig } from "../config/load-config.js";
import { getScheduleStatus, type ScheduleStatusResult } from "./manage-schedules.js";
import { HotwordDatabase } from "../storage/database.js";
import type { AppConfig, PushChannelConfig } from "../config/schema.js";
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

export interface PushChannelStatus {
  type: PushChannelConfig["type"];
  enabled: boolean;
  dryRun: boolean;
  readiness: "disabled" | "preview_only" | "ready" | "misconfigured";
  detail: string;
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

function getPushChannelStatus(channel: PushChannelConfig): PushChannelStatus {
  if (!channel.enabled) {
    return {
      type: channel.type,
      enabled: false,
      dryRun: channel.dryRun,
      readiness: "disabled",
      detail: "channel disabled",
    };
  }

  if (channel.dryRun) {
    return {
      type: channel.type,
      enabled: true,
      dryRun: true,
      readiness: "preview_only",
      detail: "dry-run only",
    };
  }

  if (channel.type === "wecom") {
    return channel.webhookUrl
      ? {
          type: channel.type,
          enabled: true,
          dryRun: false,
          readiness: "ready",
          detail: "webhook configured",
        }
      : {
          type: channel.type,
          enabled: true,
          dryRun: false,
          readiness: "misconfigured",
          detail: "missing webhookUrl",
        };
  }

  const missingFields = [
    !channel.smtpHost && "smtpHost",
    !channel.smtpUser && "smtpUser",
    !channel.smtpPass && "smtpPass",
    !channel.emailFrom && "emailFrom",
    !channel.emailTo && "emailTo",
  ].filter(Boolean);

  return missingFields.length === 0
    ? {
        type: channel.type,
        enabled: true,
        dryRun: false,
        readiness: "ready",
        detail: "smtp delivery configured",
      }
    : {
        type: channel.type,
        enabled: true,
        dryRun: false,
        readiness: "misconfigured",
        detail: `missing ${missingFields.join(", ")}`,
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
