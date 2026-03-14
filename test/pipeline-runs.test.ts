import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { runDailyPipeline } from "../src/pipeline/run-daily.js";
import { HotwordDatabase } from "../src/storage/database.js";
import { createAppPaths } from "../src/utils/paths.js";

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
});
