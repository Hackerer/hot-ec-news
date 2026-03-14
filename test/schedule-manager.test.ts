import { existsSync, mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  getScheduleStatus,
  installSchedule,
  removeSchedule,
} from "../src/pipeline/manage-schedules.js";

describe("schedule manager", () => {
  test("installs launchd schedule on macOS runtime", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-schedule-manager-"));
    const homeDir = path.join(rootDir, "home");
    mkdirSync(path.join(homeDir, "Library", "LaunchAgents"), { recursive: true });
    const calls: Array<{ command: string; args: string[] }> = [];

    const result = installSchedule("macos", "09:00", rootDir, {
      runtimePlatform: "darwin",
      homeDir,
      uid: 501,
      execute: (command, args) => {
        calls.push({ command, args });
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    const installedPath = path.join(homeDir, "Library", "LaunchAgents", "com.hackerer.hot-ec-news.plist");
    expect(result.mode).toBe("executed");
    expect(result.filePath).toBe(installedPath);
    expect(existsSync(installedPath)).toBe(true);
    expect(readFileSync(installedPath, "utf8")).toContain("npm run run:daily");
    expect(calls).toEqual([
      {
        command: "launchctl",
        args: ["bootout", "gui/501", installedPath],
      },
      {
        command: "launchctl",
        args: ["bootstrap", "gui/501", installedPath],
      },
      {
        command: "launchctl",
        args: ["enable", "gui/501/com.hackerer.hot-ec-news"],
      },
    ]);
  });

  test("removes launchd schedule on macOS runtime", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-schedule-manager-"));
    const homeDir = path.join(rootDir, "home");
    mkdirSync(path.join(homeDir, "Library", "LaunchAgents"), { recursive: true });

    installSchedule("macos", "09:00", rootDir, {
      runtimePlatform: "darwin",
      homeDir,
      uid: 501,
      execute: () => ({ status: 0, stdout: "", stderr: "" }),
    });

    const calls: Array<{ command: string; args: string[] }> = [];
    const result = removeSchedule("macos", rootDir, {
      runtimePlatform: "darwin",
      homeDir,
      uid: 501,
      execute: (command, args) => {
        calls.push({ command, args });
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    expect(result.mode).toBe("executed");
    expect(existsSync(result.filePath)).toBe(false);
    expect(calls).toEqual([
      {
        command: "launchctl",
        args: ["bootout", "gui/501", result.filePath],
      },
    ]);
  });

  test("reports launchd status on macOS runtime", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-schedule-manager-"));
    const homeDir = path.join(rootDir, "home");
    mkdirSync(path.join(homeDir, "Library", "LaunchAgents"), { recursive: true });

    installSchedule("macos", "09:00", rootDir, {
      runtimePlatform: "darwin",
      homeDir,
      uid: 501,
      execute: () => ({ status: 0, stdout: "", stderr: "" }),
    });

    const status = getScheduleStatus("macos", rootDir, {
      runtimePlatform: "darwin",
      homeDir,
      uid: 501,
      execute: () => ({
        status: 0,
        stdout: "state = running",
        stderr: "",
      }),
    });

    expect(status.supported).toBe(true);
    expect(status.installed).toBe(true);
    expect(status.active).toBe(true);
    expect(status.rawOutput).toContain("state = running");
  });

  test("generates Windows scripts without executing them on non-Windows runtime", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-schedule-manager-"));

    const installResult = installSchedule("windows", "09:00", rootDir, {
      runtimePlatform: "darwin",
    });
    const status = getScheduleStatus("windows", rootDir, {
      runtimePlatform: "darwin",
    });
    const removal = removeSchedule("windows", rootDir, {
      runtimePlatform: "darwin",
    });

    expect(installResult.mode).toBe("generated_only");
    expect(installResult.filePath).toContain("install-hot-ec-news.ps1");
    expect(status.supported).toBe(false);
    expect(status.filePath).toContain("status-hot-ec-news.ps1");
    expect(removal.mode).toBe("generated_only");
    expect(removal.filePath).toContain("remove-hot-ec-news.ps1");
  });
});
