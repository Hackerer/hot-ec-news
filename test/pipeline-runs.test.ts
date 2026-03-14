import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { runDailyPipeline } from "../src/pipeline/run-daily.js";
import { HotwordDatabase } from "../src/storage/database.js";
import { createAppPaths, ensureAppDirectories } from "../src/utils/paths.js";

describe("pipeline run history", () => {
  test("stores the latest run outcome for run:daily", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-pipeline-runs-"));
    mkdirSync(path.join(rootDir, "config"), { recursive: true });
    writeFileSync(
      path.join(rootDir, "config", "app.json"),
      JSON.stringify({
        autoPushOnDaily: false,
        sources: [
          { provider: "taobao", enabled: true, tier: "primary", kind: "platform_suggestions" },
          { provider: "jd", enabled: true, tier: "primary", kind: "platform_suggestions" },
        ],
        pushChannels: [],
      }),
      "utf8",
    );

    const fetchStub: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("suggest.taobao.com")) {
        return new Response(JSON.stringify({ result: [["连衣裙女夏", "100"]] }));
      }
      return new Response(JSON.stringify([{ keyword: "连衣裙女夏" }]));
    };

    await runDailyPipeline(rootDir, fetchStub);

    const database = new HotwordDatabase(createAppPaths(rootDir).dbFile);
    database.init();
    const latestRun = database.getLatestPipelineRun();

    expect(latestRun?.command).toBe("run:daily");
    expect(latestRun?.status).toBe("success");
    expect(latestRun?.reportPath).toBeTruthy();
  });

  test("lists recent pipeline runs with failures first by time", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-pipeline-runs-"));
    const paths = createAppPaths(rootDir);
    ensureAppDirectories(paths);
    const database = new HotwordDatabase(paths.dbFile);
    database.init();

    database.savePipelineRun({
      runKey: "run-older",
      command: "run:daily",
      status: "success",
      startedAt: "2026-03-13T09:00:00.000Z",
      finishedAt: "2026-03-13T09:00:30.000Z",
      warnings: [],
      importedFiles: ["a.csv"],
      skippedFiles: [],
      pushOutputs: [],
      reportPath: path.join(rootDir, "data", "reports", "validated-2026-03-13.md"),
    });
    database.savePipelineRun({
      runKey: "run-newer",
      command: "run:daily",
      status: "failed",
      startedAt: "2026-03-14T09:00:00.000Z",
      finishedAt: "2026-03-14T09:00:05.000Z",
      warnings: ["jd timeout"],
      importedFiles: [],
      skippedFiles: ["chanmama-sample.csv"],
      pushOutputs: [],
      errorMessage: "JD unavailable",
    });

    const runs = database.listPipelineRuns(5);

    expect(runs).toHaveLength(2);
    expect(runs[0]).toMatchObject({
      runKey: "run-newer",
      status: "failed",
      errorMessage: "JD unavailable",
    });
    expect(runs[1]).toMatchObject({
      runKey: "run-older",
      status: "success",
    });
  });
});
