import { DatabaseSync } from "node:sqlite";

import type { CollectedHotword, DailyReport, SourceKind } from "../types/hotword.js";

export interface ProcessedImportRecord {
  provider: CollectedHotword["provider"];
  fileName: string;
  fileHash: string;
  fileSize: number;
  processedAt: string;
  archivePath: string;
}

interface HotwordListFilters {
  sourceKind?: SourceKind;
  excludeSourceKinds?: SourceKind[];
}

export interface PipelineRunRecord {
  runKey: string;
  command: string;
  status: "success" | "failed";
  startedAt: string;
  finishedAt: string;
  warnings: string[];
  importedFiles: string[];
  skippedFiles: string[];
  pushOutputs: string[];
  reportPath?: string;
  errorMessage?: string;
}

interface PipelineRunRow extends Record<string, unknown> {
  runKey: unknown;
  command: unknown;
  status: unknown;
  startedAt: unknown;
  finishedAt: unknown;
  warningsJson: unknown;
  importedFilesJson: unknown;
  skippedFilesJson: unknown;
  pushOutputsJson: unknown;
  reportPath?: unknown;
  errorMessage?: unknown;
}

function mapPipelineRunRow(row: PipelineRunRow): PipelineRunRecord {
  return {
    runKey: String(row.runKey),
    command: String(row.command),
    status: String(row.status) as PipelineRunRecord["status"],
    startedAt: String(row.startedAt),
    finishedAt: String(row.finishedAt),
    warnings: JSON.parse(String(row.warningsJson)) as string[],
    importedFiles: JSON.parse(String(row.importedFilesJson)) as string[],
    skippedFiles: JSON.parse(String(row.skippedFilesJson)) as string[],
    pushOutputs: JSON.parse(String(row.pushOutputsJson)) as string[],
    ...(row.reportPath ? { reportPath: String(row.reportPath) } : {}),
    ...(row.errorMessage ? { errorMessage: String(row.errorMessage) } : {}),
  };
}

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

      CREATE TABLE IF NOT EXISTS processed_imports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        processed_at TEXT NOT NULL,
        archive_path TEXT NOT NULL,
        UNIQUE(provider, file_name, file_hash)
      );

      CREATE TABLE IF NOT EXISTS pipeline_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_key TEXT NOT NULL UNIQUE,
        command TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT NOT NULL,
        warnings_json TEXT NOT NULL,
        imported_files_json TEXT NOT NULL,
        skipped_files_json TEXT NOT NULL,
        push_outputs_json TEXT NOT NULL,
        report_path TEXT,
        error_message TEXT
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

  listHotwordsByDate(datePrefix: string, filters: HotwordListFilters = {}): CollectedHotword[] {
    const clauses = ["substr(captured_at, 1, 10) = ?"];
    const values: Array<string> = [datePrefix];

    if (filters.sourceKind) {
      clauses.push("source_kind = ?");
      values.push(filters.sourceKind);
    }

    if (filters.excludeSourceKinds && filters.excludeSourceKinds.length > 0) {
      clauses.push(
        `source_kind NOT IN (${filters.excludeSourceKinds.map(() => "?").join(", ")})`,
      );
      values.push(...filters.excludeSourceKinds);
    }

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
        WHERE ${clauses.join(" AND ")}
        ORDER BY captured_at DESC, score_normalized DESC
      `)
      .all(...values) as Array<Record<string, unknown>>;

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

  getLatestCollectionDate(filters: HotwordListFilters = {}): string | null {
    const clauses: string[] = [];
    const values: string[] = [];

    if (filters.sourceKind) {
      clauses.push("source_kind = ?");
      values.push(filters.sourceKind);
    }

    if (filters.excludeSourceKinds && filters.excludeSourceKinds.length > 0) {
      clauses.push(
        `source_kind NOT IN (${filters.excludeSourceKinds.map(() => "?").join(", ")})`,
      );
      values.push(...filters.excludeSourceKinds);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const row = this.db
      .prepare(`
        SELECT captured_at AS capturedAt
        FROM collected_hotwords
        ${whereClause}
        ORDER BY captured_at DESC
        LIMIT 1
      `)
      .get(...values) as Record<string, unknown> | undefined;

    if (!row?.capturedAt) {
      return null;
    }

    return String(row.capturedAt).slice(0, 10);
  }

  getPreviousCollectionDate(beforeDate: string, filters: HotwordListFilters = {}): string | null {
    const clauses = ["substr(captured_at, 1, 10) < ?"];
    const values: string[] = [beforeDate];

    if (filters.sourceKind) {
      clauses.push("source_kind = ?");
      values.push(filters.sourceKind);
    }

    if (filters.excludeSourceKinds && filters.excludeSourceKinds.length > 0) {
      clauses.push(
        `source_kind NOT IN (${filters.excludeSourceKinds.map(() => "?").join(", ")})`,
      );
      values.push(...filters.excludeSourceKinds);
    }

    const row = this.db
      .prepare(`
        SELECT substr(captured_at, 1, 10) AS datePrefix
        FROM collected_hotwords
        WHERE ${clauses.join(" AND ")}
        GROUP BY substr(captured_at, 1, 10)
        ORDER BY datePrefix DESC
        LIMIT 1
      `)
      .get(...values) as Record<string, unknown> | undefined;

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
        ORDER BY
          CASE
            WHEN report_key LIKE 'validated-%' THEN 1
            WHEN report_key LIKE 'live-%' THEN 2
            WHEN report_key LIKE 'fixture-%' THEN 3
            ELSE 4
          END,
          generated_at DESC
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

  hasProcessedImport(provider: CollectedHotword["provider"], fileName: string, fileHash: string): boolean {
    const row = this.db
      .prepare(`
        SELECT 1 AS found
        FROM processed_imports
        WHERE provider = ? AND file_name = ? AND file_hash = ?
        LIMIT 1
      `)
      .get(provider, fileName, fileHash) as Record<string, unknown> | undefined;

    return Boolean(row?.found);
  }

  saveProcessedImport(record: ProcessedImportRecord): void {
    this.db
      .prepare(`
        INSERT INTO processed_imports (
          provider,
          file_name,
          file_hash,
          file_size,
          processed_at,
          archive_path
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(provider, file_name, file_hash) DO UPDATE SET
          file_size = excluded.file_size,
          processed_at = excluded.processed_at,
          archive_path = excluded.archive_path
      `)
      .run(
        record.provider,
        record.fileName,
        record.fileHash,
        record.fileSize,
        record.processedAt,
        record.archivePath,
      );
  }

  listProcessedImports(limit = 20): ProcessedImportRecord[] {
    const rows = this.db
      .prepare(`
        SELECT
          provider,
          file_name AS fileName,
          file_hash AS fileHash,
          file_size AS fileSize,
          processed_at AS processedAt,
          archive_path AS archivePath
        FROM processed_imports
        ORDER BY processed_at DESC
        LIMIT ?
      `)
      .all(limit) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      provider: String(row.provider) as ProcessedImportRecord["provider"],
      fileName: String(row.fileName),
      fileHash: String(row.fileHash),
      fileSize: Number(row.fileSize),
      processedAt: String(row.processedAt),
      archivePath: String(row.archivePath),
    }));
  }

  savePipelineRun(record: PipelineRunRecord): void {
    this.db
      .prepare(`
        INSERT INTO pipeline_runs (
          run_key,
          command,
          status,
          started_at,
          finished_at,
          warnings_json,
          imported_files_json,
          skipped_files_json,
          push_outputs_json,
          report_path,
          error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(run_key) DO UPDATE SET
          status = excluded.status,
          finished_at = excluded.finished_at,
          warnings_json = excluded.warnings_json,
          imported_files_json = excluded.imported_files_json,
          skipped_files_json = excluded.skipped_files_json,
          push_outputs_json = excluded.push_outputs_json,
          report_path = excluded.report_path,
          error_message = excluded.error_message
      `)
      .run(
        record.runKey,
        record.command,
        record.status,
        record.startedAt,
        record.finishedAt,
        JSON.stringify(record.warnings),
        JSON.stringify(record.importedFiles),
        JSON.stringify(record.skippedFiles),
        JSON.stringify(record.pushOutputs),
        record.reportPath ?? null,
        record.errorMessage ?? null,
      );
  }

  getLatestPipelineRun(): PipelineRunRecord | null {
    const row = this.db
      .prepare(`
        SELECT
          run_key AS runKey,
          command,
          status,
          started_at AS startedAt,
          finished_at AS finishedAt,
          warnings_json AS warningsJson,
          imported_files_json AS importedFilesJson,
          skipped_files_json AS skippedFilesJson,
          push_outputs_json AS pushOutputsJson,
          report_path AS reportPath,
          error_message AS errorMessage
        FROM pipeline_runs
        ORDER BY started_at DESC
        LIMIT 1
      `)
      .get() as PipelineRunRow | undefined;

    if (!row) {
      return null;
    }

    return mapPipelineRunRow(row);
  }

  listPipelineRuns(limit = 10): PipelineRunRecord[] {
    const rows = this.db
      .prepare(`
        SELECT
          run_key AS runKey,
          command,
          status,
          started_at AS startedAt,
          finished_at AS finishedAt,
          warnings_json AS warningsJson,
          imported_files_json AS importedFilesJson,
          skipped_files_json AS skippedFilesJson,
          push_outputs_json AS pushOutputsJson,
          report_path AS reportPath,
          error_message AS errorMessage
        FROM pipeline_runs
        ORDER BY started_at DESC
        LIMIT ?
      `)
      .all(limit) as PipelineRunRow[];

    return rows.map((row) => mapPipelineRunRow(row));
  }
}
