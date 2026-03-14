import type { AggregatedHotword, DailyReport } from "../types/hotword.js";

const confidenceBandLabels = {
  high: "高",
  medium: "中",
  low: "低",
} as const;

const validationStatusLabels = {
  validated: "已第二信源校验",
  primary_only: "仅第一信源",
  secondary_only: "仅第二信源",
} as const;

function formatHotwordLine(item: AggregatedHotword): string {
  const trend =
    item.trend.status === "new"
      ? "新上榜"
      : `变化 ${item.trend.deltaScore >= 0 ? "+" : ""}${item.trend.deltaScore.toFixed(2)}`;

  return `- ${item.keyword} | ${trend} | 可信度 ${confidenceBandLabels[item.confidenceBand]} ${item.confidence.toFixed(2)}`;
}

export function renderPushDigestMarkdown(reportKey: string, report: DailyReport): string {
  const lines: string[] = [
    `# hot-ec-news ${reportKey}`,
    "",
    `生成时间：${report.generatedAt}`,
    `总词条：${report.totals.aggregated}，高可信：${report.totals.highConfidence}，待复核：${report.totals.reviewNeeded}，新增：${report.totals.newEntries}`,
    "",
    "## 高可信热词",
  ];

  if (report.confidenceHighlights.length === 0) {
    lines.push("- 当前没有高可信词");
  } else {
    for (const item of report.confidenceHighlights.slice(0, 5)) {
      lines.push(formatHotwordLine(item));
    }
  }

  lines.push("", "## 新增爆发词");
  if (report.newHighlights.length === 0) {
    lines.push("- 当前没有新增词");
  } else {
    for (const item of report.newHighlights.slice(0, 5)) {
      lines.push(formatHotwordLine(item));
    }
  }

  lines.push("", "## 待人工复核");
  if (report.reviewHighlights.length === 0) {
    lines.push("- 当前没有需要复核的词");
  } else {
    for (const item of report.reviewHighlights.slice(0, 5)) {
      const reasons = item.reviewFlags.join(", ");
      lines.push(`${formatHotwordLine(item)} | 原因 ${reasons}`);
    }
  }

  if (report.warnings.length > 0) {
    lines.push("", "## 异常", ...report.warnings.slice(0, 3).map((warning) => `- ${warning}`));
  }

  return `${lines.join("\n").trim()}\n`;
}

function renderHtmlList(items: AggregatedHotword[], emptyText: string, includeReviewReason = false): string {
  if (items.length === 0) {
    return `<p>${emptyText}</p>`;
  }

  const rows = items
    .slice(0, 5)
    .map((item) => {
      const trend =
        item.trend.status === "new"
          ? "新上榜"
          : `${item.trend.deltaScore >= 0 ? "+" : ""}${item.trend.deltaScore.toFixed(2)}`;
      const reviewReason = includeReviewReason ? `<td>${item.reviewFlags.join(", ")}</td>` : "";

      return `<tr><td>${item.keyword}</td><td>${trend}</td><td>${confidenceBandLabels[item.confidenceBand]} ${item.confidence.toFixed(
        2,
      )}</td><td>${validationStatusLabels[item.validationStatus]}</td>${reviewReason}</tr>`;
    })
    .join("");

  const reviewHead = includeReviewReason ? "<th>复核原因</th>" : "";
  return `<table><thead><tr><th>关键词</th><th>趋势</th><th>可信度</th><th>校验状态</th>${reviewHead}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function renderEmailHtml(reportKey: string, report: DailyReport): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>hot-ec-news ${reportKey}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: #111827; }
      h1, h2 { margin-bottom: 12px; }
      .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
      .card { background: #f3f4f6; border-radius: 12px; padding: 16px; }
      .value { font-size: 24px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; text-align: left; vertical-align: top; }
      th { background: #f9fafb; }
      .warning { color: #b45309; }
    </style>
  </head>
  <body>
    <h1>hot-ec-news ${reportKey}</h1>
    <p>生成时间：${report.generatedAt}</p>
    <div class="summary">
      <div class="card"><div>聚合词条</div><div class="value">${report.totals.aggregated}</div></div>
      <div class="card"><div>高可信</div><div class="value">${report.totals.highConfidence}</div></div>
      <div class="card"><div>待复核</div><div class="value">${report.totals.reviewNeeded}</div></div>
      <div class="card"><div>新增词</div><div class="value">${report.totals.newEntries}</div></div>
    </div>
    <h2>高可信热词</h2>
    ${renderHtmlList(report.confidenceHighlights, "当前没有高可信词")}
    <h2>新增爆发词</h2>
    ${renderHtmlList(report.newHighlights, "当前没有新增词")}
    <h2>待人工复核</h2>
    ${renderHtmlList(report.reviewHighlights, "当前没有需要复核的词", true)}
    ${
      report.warnings.length > 0
        ? `<h2>异常</h2><ul>${report.warnings
            .slice(0, 3)
            .map((warning) => `<li class="warning">${warning}</li>`)
            .join("")}</ul>`
        : ""
    }
  </body>
</html>`;
}
