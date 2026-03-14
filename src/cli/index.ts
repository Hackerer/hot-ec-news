#!/usr/bin/env node

import { Command } from "commander";

import { runFixtureDemo } from "../pipeline/run-fixture-demo.js";
import { HotwordDatabase } from "../storage/database.js";
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
