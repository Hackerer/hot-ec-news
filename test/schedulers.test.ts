import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { generateScheduleFile } from "../src/pipeline/generate-schedules.js";
import {
  generateWindowsTaskRemoveScript,
  generateWindowsTaskStatusScript,
} from "../src/schedulers/windows-task-scheduler.js";

describe("generateScheduleFile", () => {
  test("writes a launchd plist", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-schedule-"));
    const filePath = generateScheduleFile("macos", "09:00", rootDir);
    const content = readFileSync(filePath, "utf8");

    expect(existsSync(filePath)).toBe(true);
    expect(content).toContain("<string>com.hackerer.hot-ec-news</string>");
    expect(content).toContain("npm run run:daily");
  });

  test("writes a windows task scheduler script", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-schedule-"));
    const filePath = generateScheduleFile("windows", "09:00", rootDir);
    const content = readFileSync(filePath, "utf8");

    expect(existsSync(filePath)).toBe(true);
    expect(content).toContain("Register-ScheduledTask");
    expect(content).toContain("npm run run:daily");
  });

  test("renders windows remove and status scripts", () => {
    expect(generateWindowsTaskRemoveScript()).toContain("Unregister-ScheduledTask");
    expect(generateWindowsTaskStatusScript()).toContain("Get-ScheduledTask");
  });
});
