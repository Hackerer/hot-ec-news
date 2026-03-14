import { DatabaseSync } from "node:sqlite";

import type { CollectedHotword, DailyReport } from "../types/hotword.js";

export class HotwordDatabase {
  private readonly db: DatabaseSync;

  constructor(databasePath: string) {
    this.db = new DatabaseSync(databasePath);
  }

  init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS collected_hotwords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        source_tier TEXT NOT NULL,
        source_kind TEXT NOT NULL,
        keyword TEXT NOT NULL,
        normalized_keyword TEXT NOT NULL,
        category TEXT NOT NULL,
        rank INTEGER NOT NULL,
        score_raw REAL,
        score_normalized REAL NOT NULL,
        captured_at TEXT NOT NULL,
        query_seed TEXT,
        metadata_json TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS collected_hotwords_lookup_idx
      ON collected_hotwords(normalized_keyword, provider, captured_at DESC);

      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_key TEXT NOT NULL UNIQUE,
        format TEXT NOT NULL,
        path TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        summary_json TEXT NOT NULL
      );
    `);
  }

  insertHotwords(records: CollectedHotword[]): number {
    const insert = this.db.prepare(`
      INSERT INTO collected_hotwords (
        provider,
        source_tier,
        source_kind,
        keyword,
        normalized_keyword,
        category,
        rank,
        score_raw,
        score_normalized,
        captured_at,
        query_seed,
        metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.exec("BEGIN");
    try {
      for (const item of records) {
        insert.run(
          item.provider,
          item.sourceTier,
          item.sourceKind,
          item.keyword,
          item.normalizedKeyword,
          item.category,
          item.rank,
          item.scoreRaw ?? null,
          item.scoreNormalized,
          item.capturedAt,
          item.querySeed ?? null,
          item.metadata ? JSON.stringify(item.metadata) : null,
        );
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return records.length;
  }

  deleteHotwordsForDate(
    datePrefix: string,
    filters: Partial<Pick<CollectedHotword, "provider" | "sourceTier" | "sourceKind">> = {},
  ): number {
    const clauses = ["substr(captured_at, 1, 10) = ?"];
    const values: Array<string> = [datePrefix];

    if (filters.provider) {
      clauses.push("provider = ?");
      values.push(filters.provider);
    }

    if (filters.sourceTier) {
      clauses.push("source_tier = ?");
      values.push(filters.sourceTier);
    }

    if (filters.sourceKind) {
      clauses.push("source_kind = ?");
      values.push(filters.sourceKind);
    }

    const statement = this.db.prepare(`DELETE FROM collected_hotwords WHERE ${clauses.join(" AND ")}`);
    const result = statement.run(...values);
    return Number(result.changes ?? 0);
  }

  listHotwords(limit = 20): CollectedHotword[] {
    const rows = this.db
      .prepare(`
        SELECT
          provider,
          source_tier AS sourceTier,
          source_kind AS sourceKind,
          keyword,
          normalized_keyword AS normalizedKeyword,
          category,
          rank,
          score_raw AS scoreRaw,
          score_normalized AS scoreNormalized,
          captured_at AS capturedAt,
          query_seed AS querySeed,
          metadata_json AS metadataJson
        FROM collected_hotwords
        ORDER BY captured_at DESC, score_normalized DESC
        LIMIT ?
      `)
      .all(limit) as Array<Record<string, unknown>>;

    return rows.map((row) => {
      const record: CollectedHotword = {
        provider: String(row.provider) as CollectedHotword["provider"],
        sourceTier: String(row.sourceTier) as CollectedHotword["sourceTier"],
        sourceKind: String(row.sourceKind) as CollectedHotword["sourceKind"],
        keyword: String(row.keyword),
        normalizedKeyword: String(row.normalizedKeyword),
        category: String(row.category) as CollectedHotword["category"],
        rank: Number(row.rank),
        scoreNormalized: Number(row.scoreNormalized),
        capturedAt: String(row.capturedAt),
      };

      if (row.scoreRaw !== null) {
        record.scoreRaw = Number(row.scoreRaw);
      }

      if (row.querySeed !== null) {
        record.querySeed = String(row.querySeed);
      }

      if (row.metadataJson !== null) {
        record.metadata = JSON.parse(String(row.metadataJson)) as Record<string, unknown>;
      }

      return record;
    });
  }

  listHotwordsByDate(datePrefix: string): CollectedHotword[] {
    const rows = this.db
      .prepare(`
        SELECT
          provider,
          source_tier AS sourceTier,
          source_kind AS sourceKind,
          keyword,
          normalized_keyword AS normalizedKeyword,
          category,
          rank,
          score_raw AS scoreRaw,
          score_normalized AS scoreNormalized,
          captured_at AS capturedAt,
          query_seed AS querySeed,
          metadata_json AS metadataJson
        FROM collected_hotwords
        WHERE substr(captured_at, 1, 10) = ?
        ORDER BY captured_at DESC, score_normalized DESC
      `)
      .all(datePrefix) as Array<Record<string, unknown>>;

    return rows.map((row) => {
      const record: CollectedHotword = {
        provider: String(row.provider) as CollectedHotword["provider"],
        sourceTier: String(row.sourceTier) as CollectedHotword["sourceTier"],
        sourceKind: String(row.sourceKind) as CollectedHotword["sourceKind"],
        keyword: String(row.keyword),
        normalizedKeyword: String(row.normalizedKeyword),
        category: String(row.category) as CollectedHotword["category"],
        rank: Number(row.rank),
        scoreNormalized: Number(row.scoreNormalized),
        capturedAt: String(row.capturedAt),
      };

      if (row.scoreRaw !== null) {
        record.scoreRaw = Number(row.scoreRaw);
      }

      if (row.querySeed !== null) {
        record.querySeed = String(row.querySeed);
      }

      if (row.metadataJson !== null) {
        record.metadata = JSON.parse(String(row.metadataJson)) as Record<string, unknown>;
      }

      return record;
    });
  }

  getLatestCollectionDate(): string | null {
    const row = this.db
      .prepare(`
        SELECT captured_at AS capturedAt
        FROM collected_hotwords
        ORDER BY captured_at DESC
        LIMIT 1
      `)
      .get() as Record<string, unknown> | undefined;

    if (!row?.capturedAt) {
      return null;
    }

    return String(row.capturedAt).slice(0, 10);
  }

  getPreviousCollectionDate(beforeDate: string): string | null {
    const row = this.db
      .prepare(`
        SELECT substr(captured_at, 1, 10) AS datePrefix
        FROM collected_hotwords
        WHERE substr(captured_at, 1, 10) < ?
        GROUP BY substr(captured_at, 1, 10)
        ORDER BY datePrefix DESC
        LIMIT 1
      `)
      .get(beforeDate) as Record<string, unknown> | undefined;

    if (!row?.datePrefix) {
      return null;
    }

    return String(row.datePrefix);
  }

  saveReport(reportKey: string, format: string, outputPath: string, report: DailyReport): void {
    this.db
      .prepare(`
        INSERT INTO reports (report_key, format, path, generated_at, summary_json)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(report_key) DO UPDATE SET
          format = excluded.format,
          path = excluded.path,
          generated_at = excluded.generated_at,
          summary_json = excluded.summary_json
      `)
      .run(reportKey, format, outputPath, report.generatedAt, JSON.stringify(report));
  }

  getLatestReport(): {
    reportKey: string;
    path: string;
    generatedAt: string;
    summary: DailyReport;
  } | null {
    const row = this.db
      .prepare(`
        SELECT report_key AS reportKey, path, generated_at AS generatedAt, summary_json AS summaryJson
        FROM reports
        ORDER BY generated_at DESC
        LIMIT 1
      `)
      .get() as Record<string, string> | undefined;

    if (!row) {
      return null;
    }

    return {
      reportKey: String(row.reportKey),
      path: String(row.path),
      generatedAt: String(row.generatedAt),
      summary: JSON.parse(String(row.summaryJson)) as DailyReport,
    };
  }
}
