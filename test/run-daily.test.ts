import { copyFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { runDailyPipeline } from "../src/pipeline/run-daily.js";

describe("runDailyPipeline", () => {
  test("collects live data, imports third-party csv files, and writes a validated report", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-daily-"));
    const importsDir = path.join(rootDir, "data", "imports");
    await import("node:fs").then(({ mkdirSync }) => mkdirSync(importsDir, { recursive: true }));
    copyFileSync(
      path.resolve("fixtures/third-party/chanmama-sample.csv"),
      path.join(importsDir, "chanmama-sample.csv"),
    );

    const fetchStub: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("suggest.taobao.com")) {
        return new Response(
          JSON.stringify({
            result: [
              ["连衣裙女夏", "20429.142072672043"],
              ["防晒衣女", "18300.11"],
              ["短靴女", "16100.01"],
              ["戒指黄金", "15800.77"],
            ],
          }),
        );
      }

      return new Response(
        JSON.stringify([
          { keyword: "连衣裙女夏" },
          { keyword: "防晒衣女" },
          { keyword: "短靴女" },
          { keyword: "戒指黄金" },
        ]),
      );
    };

    const result = await runDailyPipeline(rootDir, fetchStub);
    expect(result.importedFiles).toContain("chanmama-sample.csv");
    expect(existsSync(result.reportPath)).toBe(true);
  });
});
