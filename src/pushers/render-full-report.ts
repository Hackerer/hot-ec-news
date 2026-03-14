function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderMarkdownBlocks(markdown: string): string {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;

  function closeList(): void {
    if (!listType) {
      return;
    }

    html.push(`</${listType}>`);
    listType = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      closeList();
      continue;
    }

    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push(`<li>${escapeHtml(orderedMatch[2] ?? "")}</li>`);
      continue;
    }

    const bulletMatch = trimmed.match(/^-+\s+(.*)$/);
    if (bulletMatch) {
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push(`<li>${escapeHtml(bulletMatch[1] ?? "")}</li>`);
      continue;
    }

    closeList();

    if (trimmed.startsWith("### ")) {
      html.push(`<h3>${escapeHtml(trimmed.slice(4))}</h3>`);
      continue;
    }

    if (trimmed.startsWith("## ")) {
      html.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`);
      continue;
    }

    if (trimmed.startsWith("# ")) {
      html.push(`<h1>${escapeHtml(trimmed.slice(2))}</h1>`);
      continue;
    }

    html.push(`<p>${escapeHtml(trimmed)}</p>`);
  }

  closeList();
  return html.join("\n");
}

export function renderFullReportEmailHtml(reportKey: string, markdown: string): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>hot-ec-news ${escapeHtml(reportKey)}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: #111827; line-height: 1.6; }
      h1, h2, h3 { margin: 20px 0 12px; }
      h1 { font-size: 28px; }
      h2 { font-size: 22px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
      h3 { font-size: 18px; }
      p { margin: 10px 0; }
      ul, ol { margin: 10px 0 18px 20px; padding: 0; }
      li { margin: 6px 0; }
      .meta { color: #4b5563; font-size: 14px; margin-bottom: 20px; }
      .shell { max-width: 960px; }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="meta">完整日报正文</div>
      ${renderMarkdownBlocks(markdown)}
    </div>
  </body>
</html>`;
}
