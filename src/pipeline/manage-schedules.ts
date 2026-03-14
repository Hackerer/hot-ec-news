import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { loadAppConfig } from "../config/load-config.js";
import { generateLaunchdPlist } from "../schedulers/launchd.js";
import {
  generateWindowsTaskRemoveScript,
  generateWindowsTaskScript,
  generateWindowsTaskStatusScript,
} from "../schedulers/windows-task-scheduler.js";
import { createAppPaths, ensureAppDirectories, resolveRootDir } from "../utils/paths.js";

type SchedulerPlatform = "macos" | "windows";
type RuntimePlatform = NodeJS.Platform;

interface CommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

type CommandExecutor = (command: string, args: string[]) => CommandResult;

interface ManageScheduleOptions {
  runtimePlatform?: RuntimePlatform;
  homeDir?: string;
  uid?: number;
  execute?: CommandExecutor;
}

export interface ScheduleActionResult {
  platform: SchedulerPlatform;
  mode: "executed" | "generated_only";
  filePath: string;
  message: string;
}

export interface ScheduleStatusResult {
  platform: SchedulerPlatform;
  supported: boolean;
  installed: boolean;
  active: boolean;
  filePath?: string;
  rawOutput?: string;
  message: string;
}

const launchdLabel = "com.hackerer.hot-ec-news";

function defaultExecutor(command: string, args: string[]): CommandResult {
  const result = spawnSync(command, args, {
    encoding: "utf8",
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function resolveOptions(options: ManageScheduleOptions): Required<ManageScheduleOptions> {
  return {
    runtimePlatform: options.runtimePlatform ?? process.platform,
    homeDir: options.homeDir ?? process.env.HOME ?? process.cwd(),
    uid: options.uid ?? process.getuid?.() ?? 0,
    execute: options.execute ?? defaultExecutor,
  };
}

function getLaunchAgentPath(homeDir: string): string {
  return path.join(homeDir, "Library", "LaunchAgents", `${launchdLabel}.plist`);
}

function writeScheduleScript(filePath: string, contents: string): string {
  writeFileSync(filePath, contents, "utf8");
  return filePath;
}

export function installSchedule(
  platform: SchedulerPlatform,
  time: string,
  explicitRoot?: string,
  options: ManageScheduleOptions = {},
): ScheduleActionResult {
  const rootDir = resolveRootDir(explicitRoot);
  const config = loadAppConfig(rootDir);
  const paths = createAppPaths(rootDir, config);
  ensureAppDirectories(paths);
  const resolved = resolveOptions(options);

  if (platform === "macos") {
    const schedulePath = path.join(paths.schedulesDir, "hot-ec-news.plist");
    writeScheduleScript(schedulePath, generateLaunchdPlist(rootDir, time));

    if (resolved.runtimePlatform !== "darwin") {
      return {
        platform,
        mode: "generated_only",
        filePath: schedulePath,
        message: `Generated launchd plist at ${schedulePath}. Install it on macOS to activate the schedule.`,
      };
    }

    const launchAgentPath = getLaunchAgentPath(resolved.homeDir);
    copyFileSync(schedulePath, launchAgentPath);
    resolved.execute("launchctl", ["bootout", `gui/${resolved.uid}`, launchAgentPath]);

    const bootstrap = resolved.execute("launchctl", ["bootstrap", `gui/${resolved.uid}`, launchAgentPath]);
    if (bootstrap.status !== 0) {
      throw new Error(bootstrap.stderr || bootstrap.stdout || "launchctl bootstrap failed");
    }

    const enable = resolved.execute("launchctl", ["enable", `gui/${resolved.uid}/${launchdLabel}`]);
    if (enable.status !== 0) {
      throw new Error(enable.stderr || enable.stdout || "launchctl enable failed");
    }

    return {
      platform,
      mode: "executed",
      filePath: launchAgentPath,
      message: `Installed launchd job ${launchdLabel} at ${launchAgentPath}.`,
    };
  }

  const schedulePath = path.join(paths.schedulesDir, "install-hot-ec-news.ps1");
  writeScheduleScript(schedulePath, generateWindowsTaskScript(rootDir, time));

  if (resolved.runtimePlatform !== "win32") {
    return {
      platform,
      mode: "generated_only",
      filePath: schedulePath,
      message: `Generated PowerShell installer at ${schedulePath}. Run it on Windows to activate the schedule.`,
    };
  }

  const install = resolved.execute("powershell.exe", [
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    schedulePath,
  ]);

  if (install.status !== 0) {
    throw new Error(install.stderr || install.stdout || "PowerShell schedule install failed");
  }

  return {
    platform,
    mode: "executed",
    filePath: schedulePath,
    message: `Installed Windows scheduled task using ${schedulePath}.`,
  };
}

export function removeSchedule(
  platform: SchedulerPlatform,
  explicitRoot?: string,
  options: ManageScheduleOptions = {},
): ScheduleActionResult {
  const rootDir = resolveRootDir(explicitRoot);
  const config = loadAppConfig(rootDir);
  const paths = createAppPaths(rootDir, config);
  ensureAppDirectories(paths);
  const resolved = resolveOptions(options);

  if (platform === "macos") {
    const launchAgentPath = getLaunchAgentPath(resolved.homeDir);

    if (resolved.runtimePlatform !== "darwin") {
      return {
        platform,
        mode: "generated_only",
        filePath: launchAgentPath,
        message: `No system changes made. Remove ${launchAgentPath} on macOS to uninstall the schedule.`,
      };
    }

    if (existsSync(launchAgentPath)) {
      resolved.execute("launchctl", ["bootout", `gui/${resolved.uid}`, launchAgentPath]);
      rmSync(launchAgentPath, { force: true });
    }

    return {
      platform,
      mode: "executed",
      filePath: launchAgentPath,
      message: `Removed launchd job ${launchdLabel} from ${launchAgentPath}.`,
    };
  }

  const removeScriptPath = path.join(paths.schedulesDir, "remove-hot-ec-news.ps1");
  writeScheduleScript(removeScriptPath, generateWindowsTaskRemoveScript());

  if (resolved.runtimePlatform !== "win32") {
    return {
      platform,
      mode: "generated_only",
      filePath: removeScriptPath,
      message: `Generated PowerShell removal script at ${removeScriptPath}. Run it on Windows to uninstall the schedule.`,
    };
  }

  const removal = resolved.execute("powershell.exe", [
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    removeScriptPath,
  ]);

  if (removal.status !== 0) {
    throw new Error(removal.stderr || removal.stdout || "PowerShell schedule removal failed");
  }

  return {
    platform,
    mode: "executed",
    filePath: removeScriptPath,
    message: `Removed Windows scheduled task using ${removeScriptPath}.`,
  };
}

export function getScheduleStatus(
  platform: SchedulerPlatform,
  explicitRoot?: string,
  options: ManageScheduleOptions = {},
): ScheduleStatusResult {
  const rootDir = resolveRootDir(explicitRoot);
  const config = loadAppConfig(rootDir);
  const paths = createAppPaths(rootDir, config);
  ensureAppDirectories(paths);
  const resolved = resolveOptions(options);

  if (platform === "macos") {
    const launchAgentPath = getLaunchAgentPath(resolved.homeDir);

    if (resolved.runtimePlatform !== "darwin") {
      return {
        platform,
        supported: false,
        installed: existsSync(path.join(paths.schedulesDir, "hot-ec-news.plist")),
        active: false,
        filePath: path.join(paths.schedulesDir, "hot-ec-news.plist"),
        message: "Runtime status lookup is only available on macOS.",
      };
    }

    if (!existsSync(launchAgentPath)) {
      return {
        platform,
        supported: true,
        installed: false,
        active: false,
        filePath: launchAgentPath,
        message: `launchd job ${launchdLabel} is not installed.`,
      };
    }

    const printResult = resolved.execute("launchctl", ["print", `gui/${resolved.uid}/${launchdLabel}`]);
    return {
      platform,
      supported: true,
      installed: true,
      active: printResult.status === 0,
      filePath: launchAgentPath,
      rawOutput: `${printResult.stdout}${printResult.stderr}`.trim(),
      message:
        printResult.status === 0
          ? `launchd job ${launchdLabel} is installed and active.`
          : `launchd job ${launchdLabel} is installed but inactive.`,
    };
  }

  const statusScriptPath = path.join(paths.schedulesDir, "status-hot-ec-news.ps1");
  writeScheduleScript(statusScriptPath, generateWindowsTaskStatusScript());

  if (resolved.runtimePlatform !== "win32") {
    return {
      platform,
      supported: false,
      installed: existsSync(path.join(paths.schedulesDir, "install-hot-ec-news.ps1")),
      active: false,
      filePath: statusScriptPath,
      message: "Runtime status lookup is only available on Windows.",
    };
  }

  const result = resolved.execute("powershell.exe", [
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    statusScriptPath,
  ]);

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "PowerShell schedule status failed");
  }

  const payload = JSON.parse(result.stdout.trim()) as {
    installed: boolean;
    state?: string;
    taskName?: string;
  };

  return {
    platform,
    supported: true,
    installed: payload.installed,
    active: payload.state === "Ready" || payload.state === "Running",
    filePath: statusScriptPath,
    rawOutput: result.stdout.trim(),
    message: payload.installed
      ? `Windows scheduled task ${payload.taskName ?? "hot-ec-news"} is ${payload.state ?? "unknown"}.`
      : "Windows scheduled task hot-ec-news is not installed.",
  };
}
