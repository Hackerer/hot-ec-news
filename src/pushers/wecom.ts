export interface WecomPushOptions {
  webhookUrl: string;
  markdown: string;
  fetchImpl?: typeof fetch;
}

export function buildWecomPayload(markdown: string): Record<string, unknown> {
  return {
    msgtype: "markdown",
    markdown: {
      content: markdown.slice(0, 4000),
    },
  };
}

export async function sendWecomReport(options: WecomPushOptions): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(options.webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(buildWecomPayload(options.markdown)),
  });

  if (!response.ok) {
    throw new Error(`WeCom push failed with status ${response.status}`);
  }
}
