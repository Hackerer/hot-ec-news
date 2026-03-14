#!/usr/bin/env node

import { Command } from "commander";

import { buildValidatedReport, importThirdPartyFile } from "../pipeline/import-third-party.js";
import { runFixtureDemo } from "../pipeline/run-fixture-demo.js";
import { runLiveCollection } from "../pipeline/run-live-collection.js";
import { HotwordDatabase } from "../storage/database.js";
import type { Provider } from "../types/hotword.js";
import { createAppPaths, ensureAppDirectories, resolveRootDir } from "../utils/paths.js";

const program = new Command();

program
  .name("hot-ec-news")
  .description("Cross-platform ecommerce hot keyword pipeline")
  .option("--root <path>", "Override workspace root");

program
  .command("init")
  .description("Initialize storage directories and SQLite database")
  .action(() => {
    const rootDir = resolveRootDir(program.opts<{ root?: string }>().root);
    const paths = createAppPaths(rootDir);
    ensureAppDirectories(paths);
    const database = new HotwordDatabase(paths.dbFile);
    database.init();
    console.log(`Initialized workspace at ${rootDir}`);
    console.log(`Database: ${paths.dbFile}`);
  });

program
  .command("demo:fixtures")
  .description("Run fixture pipeline and generate a sample markdown report")
  .action(() => {
    const rootDir = resolveRootDir(program.opts<{ root?: string }>().root);
    const result = runFixtureDemo(rootDir);
    console.log(`Collected ${result.collected} fixture hotwords.`);
    console.log(`Report key: ${result.reportKey}`);
    console.log(`Report path: ${result.reportPath}`);
  });

program
  .command("collect:live")
  .description("Collect live keywords from Taobao and JD suggestion endpoints")
  .action(async () => {
    const rootDir = resolveRootDir(program.opts<{ root?: string }>().root);
    const result = await runLiveCollection(rootDir);
    console.log(`Collected ${result.collected} live hotwords.`);
    console.log(`Seeds: ${result.seeds.join(", ")}`);
    console.log(`Report key: ${result.reportKey}`);
    console.log(`Report path: ${result.reportPath}`);
  });

program
  .command("import:third-party")
  .description("Import a third-party CSV export for validation")
  .requiredOption("--provider <provider>", "Provider name, e.g. chanmama or feigua")
  .requiredOption("--file <path>", "CSV export file path")
  .action((options: { provider: string; file: string }) => {
    const rootDir = resolveRootDir(program.opts<{ root?: string }>().root);
    const result = importThirdPartyFile(options.provider as Provider, options.file, rootDir);
    console.log(`Imported ${result.imported} records from ${result.provider}.`);
    console.log(`Archive path: ${result.archivePath}`);
  });

program
  .command("report:validated")
  .description("Build a validated report from the latest collected date")
  .action(() => {
    const rootDir = resolveRootDir(program.opts<{ root?: string }>().root);
    const result = buildValidatedReport(rootDir);
    console.log(`Validated report key: ${result.reportKey}`);
    console.log(`Records used: ${result.recordCount}`);
    console.log(`Report path: ${result.reportPath}`);
  });

program
  .command("status")
  .description("Show latest report status")
  .action(() => {
    const rootDir = resolveRootDir(program.opts<{ root?: string }>().root);
    const paths = createAppPaths(rootDir);
    ensureAppDirectories(paths);
    const database = new HotwordDatabase(paths.dbFile);
    database.init();
    const latest = database.getLatestReport();

    if (!latest) {
      console.log("No reports generated yet.");
      return;
    }

    console.log(`Latest report: ${latest.reportKey}`);
    console.log(`Generated at: ${latest.generatedAt}`);
    console.log(`Path: ${latest.path}`);
  });

program.parse();
