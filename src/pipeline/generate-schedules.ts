import { writeFileSync } from "node:fs";
import path from "node:path";

import { generateLaunchdPlist } from "../schedulers/launchd.js";
import { generateWindowsTaskScript } from "../schedulers/windows-task-scheduler.js";
import { createAppPaths, ensureAppDirectories, resolveRootDir } from "../utils/paths.js";

export function generateScheduleFile(
  platform: "macos" | "windows",
  time: string,
  explicitRoot?: string,
): string {
  const rootDir = resolveRootDir(explicitRoot);
  const paths = createAppPaths(rootDir);
  ensureAppDirectories(paths);

  if (platform === "macos") {
    const filePath = path.join(paths.schedulesDir, "hot-ec-news.plist");
    writeFileSync(filePath, generateLaunchdPlist(rootDir, time), "utf8");
    return filePath;
  }

  const filePath = path.join(paths.schedulesDir, "install-hot-ec-news.ps1");
  writeFileSync(filePath, generateWindowsTaskScript(rootDir, time), "utf8");
  return filePath;
}
