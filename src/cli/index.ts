#!/usr/bin/env node

import { Command } from "commander";

import { generateScheduleFile } from "../pipeline/generate-schedules.js";
import { buildValidatedReport, importThirdPartyFile } from "../pipeline/import-third-party.js";
import { pushLatestReport, type PushLatestReportOptions } from "../pipeline/push-latest-report.js";
import { runDailyPipeline } from "../pipeline/run-daily.js";
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
  .command("run:daily")
  .description("Run live collection, optional third-party imports, and validated reporting")
  .action(async () => {
    const rootDir = resolveRootDir(program.opts<{ root?: string }>().root);
    const result = await runDailyPipeline(rootDir);
    console.log(`Daily pipeline completed.`);
    console.log(`Imported files: ${result.importedFiles.join(", ") || "(none)"}`);
    console.log(`Report path: ${result.reportPath}`);
  });

program
  .command("push:report")
  .description("Push the latest report through WeCom or email")
  .requiredOption("--channel <channel>", "wecom or email")
  .option("--dry-run", "Write a preview instead of sending", false)
  .option("--webhook <url>", "WeCom webhook URL")
  .option("--smtp-host <host>", "SMTP host")
  .option("--smtp-port <port>", "SMTP port")
  .option("--smtp-user <user>", "SMTP user")
  .option("--smtp-pass <pass>", "SMTP password")
  .option("--email-from <from>", "Email from address")
  .option("--email-to <to>", "Email to address")
  .action(async (options) => {
    const rootDir = resolveRootDir(program.opts<{ root?: string }>().root);
    const pushOptions: PushLatestReportOptions = {
      channel: options.channel,
      explicitRoot: rootDir,
      dryRun: options.dryRun,
    };

    if (options.webhook) pushOptions.webhookUrl = options.webhook;
    if (options.smtpHost) pushOptions.smtpHost = options.smtpHost;
    if (options.smtpPort) pushOptions.smtpPort = Number(options.smtpPort);
    if (options.smtpUser) pushOptions.smtpUser = options.smtpUser;
    if (options.smtpPass) pushOptions.smtpPass = options.smtpPass;
    if (options.emailFrom) pushOptions.emailFrom = options.emailFrom;
    if (options.emailTo) pushOptions.emailTo = options.emailTo;

    const outputPath = await pushLatestReport(pushOptions);
    console.log(`Push output: ${outputPath}`);
  });

program
  .command("schedule:generate")
  .description("Generate a macOS or Windows scheduler file for the daily pipeline")
  .requiredOption("--platform <platform>", "macos or windows")
  .option("--time <time>", "Daily time in HH:MM", "09:00")
  .action((options: { platform: "macos" | "windows"; time: string }) => {
    const rootDir = resolveRootDir(program.opts<{ root?: string }>().root);
    const filePath = generateScheduleFile(options.platform, options.time, rootDir);
    console.log(`Schedule file: ${filePath}`);
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
