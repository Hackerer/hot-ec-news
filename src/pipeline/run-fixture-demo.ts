import { writeFileSync } from "node:fs";
import path from "node:path";

import { createDefaultConfig } from "../config/defaults.js";
import { buildDailyReport } from "../core/aggregate.js";
import { getFixtureHotwords } from "../fixtures/hotwords.js";
import { renderMarkdownReport } from "../reports/render-markdown.js";
import { HotwordDatabase } from "../storage/database.js";
import { createAppPaths, ensureAppDirectories, resolveRootDir } from "../utils/paths.js";

export interface FixtureDemoResult {
  reportPath: string;
  reportKey: string;
  collected: number;
}

export function runFixtureDemo(explicitRoot?: string): FixtureDemoResult {
  const rootDir = resolveRootDir(explicitRoot);
  const paths = createAppPaths(rootDir);
  const config = createDefaultConfig();

  ensureAppDirectories(paths);

  const database = new HotwordDatabase(paths.dbFile);
  database.init();

  const records = getFixtureHotwords();
  database.insertHotwords(records);

  const report = buildDailyReport(records, config.timezone);
  const markdown = renderMarkdownReport(report);
  const reportKey = `fixture-${report.generatedAt.slice(0, 10)}`;
  const reportPath = path.join(paths.reportDir, `${reportKey}.md`);

  writeFileSync(reportPath, markdown, "utf8");
  database.saveReport(reportKey, "markdown", reportPath, report);

  return {
    reportPath,
    reportKey,
    collected: records.length,
  };
}
