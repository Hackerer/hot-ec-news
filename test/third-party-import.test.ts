import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { importThirdPartyCsv } from "../src/importers/third-party-csv.js";
import { buildValidatedReport, importThirdPartyFile } from "../src/pipeline/import-third-party.js";
import { runLiveCollection } from "../src/pipeline/run-live-collection.js";

describe("importThirdPartyCsv", () => {
  test("parses third-party csv exports", () => {
    const records = importThirdPartyCsv(
      "chanmama",
      path.resolve("fixtures/third-party/chanmama-sample.csv"),
      "2026-03-14T09:00:00+08:00",
    );

    expect(records).toHaveLength(4);
    expect(records[0]?.provider).toBe("chanmama");
    expect(records[0]?.sourceTier).toBe("secondary");
    expect(records[0]?.category).toBe("apparel");
  });
});

describe("validated reporting", () => {
  test("builds a validated report from primary and secondary signals", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-validated-"));
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

    await runLiveCollection(rootDir, fetchStub, "2026-03-14T09:00:00+08:00");
    importThirdPartyFile(
      "chanmama",
      path.resolve("fixtures/third-party/chanmama-sample.csv"),
      rootDir,
      "2026-03-14T10:00:00+08:00",
    );

    const result = buildValidatedReport(rootDir);
    const markdown = readFileSync(result.reportPath, "utf8");

    expect(existsSync(result.reportPath)).toBe(true);
    expect(markdown).toContain("## 第三方校验结果");
    expect(markdown).toContain("连衣裙女夏");
    expect(markdown).toContain("chanmama");
  });
});
