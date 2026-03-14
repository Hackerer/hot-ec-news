import { mkdirSync } from "node:fs";
import path from "node:path";

interface PathOverrides {
  reportDir?: string;
  databasePath?: string;
}

export interface AppPaths {
  rootDir: string;
  dataDir: string;
  reportDir: string;
  dbFile: string;
  rawDir: string;
  normalizedDir: string;
  snapshotsDir: string;
  importsDir: string;
  pushPreviewDir: string;
  schedulesDir: string;
}

export function resolveRootDir(explicitRoot?: string): string {
  return path.resolve(explicitRoot ?? process.env.HOT_EC_NEWS_ROOT ?? process.cwd());
}

function resolveProjectPath(rootDir: string, targetPath: string): string {
  return path.isAbsolute(targetPath) ? targetPath : path.join(rootDir, targetPath);
}

export function createAppPaths(rootDir: string, overrides: PathOverrides = {}): AppPaths {
  return {
    rootDir,
    dataDir: path.join(rootDir, "data"),
    reportDir: resolveProjectPath(rootDir, overrides.reportDir ?? path.join("data", "reports")),
    dbFile: resolveProjectPath(
      rootDir,
      overrides.databasePath ?? path.join("data", "db", "hot-ec-news.sqlite"),
    ),
    rawDir: path.join(rootDir, "data", "raw"),
    normalizedDir: path.join(rootDir, "data", "normalized"),
    snapshotsDir: path.join(rootDir, "data", "snapshots"),
    importsDir: path.join(rootDir, "data", "imports"),
    pushPreviewDir: path.join(rootDir, "data", "push-preview"),
    schedulesDir: path.join(rootDir, "data", "schedules"),
  };
}

export function ensureAppDirectories(paths: AppPaths): void {
  for (const directory of [
    paths.dataDir,
    path.dirname(paths.dbFile),
    path.dirname(paths.reportDir),
    paths.reportDir,
    paths.rawDir,
    paths.normalizedDir,
    paths.snapshotsDir,
    paths.importsDir,
    paths.pushPreviewDir,
    paths.schedulesDir,
  ]) {
    mkdirSync(directory, { recursive: true });
  }
}
