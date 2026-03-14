import { writeFileSync } from "node:fs";
import path from "node:path";

import { loadAppConfig } from "../config/load-config.js";
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
  const config = loadAppConfig(rootDir);
  const paths = createAppPaths(rootDir, config);

  ensureAppDirectories(paths);

  const database = new HotwordDatabase(paths.dbFile);
  database.init();

  const records = getFixtureHotwords();
  database.deleteHotwordsForDate(records[0]?.capturedAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10), {
    sourceKind: "fixture",
  });
  database.insertHotwords(records);

  const report = buildDailyReport(records, config.timezone, [], [], config.categories);
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
