import { existsSync } from "node:fs";

import { loadAppConfig } from "../config/load-config.js";
import { getScheduleStatus } from "./manage-schedules.js";
import { getPushChannelStatus } from "./push-readiness.js";
import { createAppPaths, ensureAppDirectories, resolveRootDir } from "../utils/paths.js";

type RuntimePlatform = NodeJS.Platform;

interface DoctorOptions {
  runtimePlatform?: RuntimePlatform;
  homeDir?: string;
  uid?: number;
  execute?: Parameters<typeof getScheduleStatus>[2] extends infer T
    ? T extends { execute?: infer E }
      ? E
      : never
    : never;
}

export interface DoctorCheck {
  id: string;
  level: "pass" | "warn" | "fail";
  summary: string;
  detail: string;
}

export interface DoctorResult {
  rootDir: string;
  ok: boolean;
  checks: DoctorCheck[];
}

export function runDoctor(explicitRoot?: string, options: DoctorOptions = {}): DoctorResult {
  const rootDir = resolveRootDir(explicitRoot);
  const config = loadAppConfig(rootDir);
  const paths = createAppPaths(rootDir, config);
  ensureAppDirectories(paths);
  const runtimePlatform = options.runtimePlatform ?? process.platform;

  const checks: DoctorCheck[] = [];
  const primarySources = config.sources.filter((source) => source.enabled && source.tier === "primary");
  const secondarySources = config.sources.filter((source) => source.enabled && source.tier === "secondary");
  const pushChannels = config.pushChannels.map(getPushChannelStatus);

  checks.push(
    config.categories.length > 0
      ? {
          id: "categories",
          level: "pass",
          summary: "Categories configured",
          detail: config.categories.join(", "),
        }
      : {
          id: "categories",
          level: "fail",
          summary: "No categories configured",
          detail: "At least one category is required.",
        },
  );

  checks.push(
    primarySources.length > 0
      ? {
          id: "primary-sources",
          level: "pass",
          summary: "Primary sources enabled",
          detail: primarySources.map((source) => source.provider).join(", "),
        }
      : {
          id: "primary-sources",
          level: "fail",
          summary: "No primary sources enabled",
          detail: "Enable at least one primary source.",
        },
  );

  checks.push({
    id: "secondary-sources",
    level: secondarySources.length > 0 ? "pass" : "warn",
    summary: secondarySources.length > 0 ? "Secondary validation sources enabled" : "No secondary validation sources enabled",
    detail: secondarySources.map((source) => source.provider).join(", ") || "Cross-source validation is currently unavailable.",
  });

  checks.push(
    existsSync(paths.reportDir) && existsSync(paths.dataDir)
      ? {
          id: "paths",
          level: "pass",
          summary: "Workspace paths ready",
          detail: `reportDir=${paths.reportDir}, dbFile=${paths.dbFile}`,
        }
      : {
          id: "paths",
          level: "fail",
          summary: "Workspace paths missing",
          detail: "Initialization paths could not be prepared.",
        },
  );

  if (config.autoPushOnDaily) {
    const readyChannels = pushChannels.filter((channel) => channel.readiness === "ready");
    const previewChannels = pushChannels.filter((channel) => channel.readiness === "preview_only");
    const misconfiguredChannels = pushChannels.filter((channel) => channel.readiness === "misconfigured");

    checks.push(
      readyChannels.length > 0
        ? {
            id: "push-ready",
            level: "pass",
            summary: "Auto push is ready",
            detail: readyChannels.map((channel) => channel.type).join(", "),
          }
        : previewChannels.length > 0
          ? {
              id: "push-ready",
              level: "warn",
              summary: "Auto push is preview-only",
              detail: previewChannels.map((channel) => `${channel.type}: ${channel.detail}`).join("; "),
            }
          : {
              id: "push-ready",
              level: "fail",
              summary: "Auto push has no ready channel",
              detail:
                misconfiguredChannels.map((channel) => `${channel.type}: ${channel.detail}`).join("; ") ||
                "Enable and configure at least one push channel.",
            },
    );
  } else {
    checks.push({
      id: "push-ready",
      level: "warn",
      summary: "Auto push is disabled",
      detail: "run:daily will not send push output automatically.",
    });
  }

  if (runtimePlatform === "darwin" || runtimePlatform === "win32") {
    const scheduleStatus = getScheduleStatus(runtimePlatform === "darwin" ? "macos" : "windows", rootDir, options);
    checks.push({
      id: "scheduler",
      level: scheduleStatus.installed && scheduleStatus.active ? "pass" : scheduleStatus.installed ? "warn" : "warn",
      summary: scheduleStatus.message,
      detail: scheduleStatus.filePath ?? "No schedule path available.",
    });
  } else {
    checks.push({
      id: "scheduler",
      level: "warn",
      summary: "Runtime scheduler status not available on this platform",
      detail: `Current runtime platform is ${runtimePlatform}.`,
    });
  }

  return {
    rootDir,
    ok: checks.every((check) => check.level !== "fail"),
    checks,
  };
}
