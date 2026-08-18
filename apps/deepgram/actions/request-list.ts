import type { ActionDefinition } from "@w6w/types";
import { DeepgramClient, isoDate, query } from "../lib/client.ts";

/**
 * `GET /v1/projects/{id}/requests` — the request log.
 *
 * ## What it is actually for
 *
 * Two things a workflow genuinely needs. **Failures**: filtering to `failed`
 * lists every request that returned 4xx or 5xx, which is how a nightly job
 * discovers that a tenth of last week's transcriptions never happened — a fact
 * no individual step ever reported, because each one failed alone.
 *
 * And **recovery**: a callback-based transcription returns only a `request_id`,
 * and if the callback never arrived, this is where the request went. Filtering
 * by `request_id` turns "we asked for it and heard nothing" into an answer.
 *
 * `limit` defaults to 10 in Deepgram's API, which is small enough to look like
 * an empty week. This defaults to 100 and caps at Deepgram's own 1000.
 */
const action: ActionDefinition = {
  key: "request-list",
  type: "read",
  resource: "request",
  title: "List requests",
  description:
    "The request log, filterable to failures — how a workflow finds out that a tenth of last " +
    "week's transcriptions never happened, which no individual step ever reported.",
  params: [
    { key: "start", label: "From", type: "datetime", default: "" },
    { key: "end", label: "To", type: "datetime", default: "" },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "",
      options: [
        { value: "", label: "All" },
        { value: "failed", label: "Failed — 4xx and 5xx" },
        { value: "succeeded", label: "Succeeded" },
      ],
    },
    {
      key: "requestId",
      label: "Request ID",
      type: "string",
      default: "",
      hint: "Look up one request — how a callback that never arrived gets traced.",
    },
    {
      key: "endpoint",
      label: "Endpoint",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "All" },
        { value: "listen", label: "Transcription" },
        { value: "read", label: "Text analysis" },
        { value: "speak", label: "Speech generation" },
      ],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      hint: "Deepgram's own default is 10, which looks like an empty week. Its maximum is 1000.",
    },
    { key: "page", label: "Page", type: "number", default: 0, advanced: true },
  ],
  output: [
    { key: "requests", type: "array", label: "Requests" },
    { key: "count", type: "number", label: "Requests returned" },
    { key: "failedCount", type: "number", label: "Of those, how many failed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new DeepgramClient(ctx);
    const limit = Math.min(1000, Math.max(1, Number(p.limit ?? 100)));
    const page = Number(p.page ?? 0);

    const body = await client.request<{
      requests?: Array<{ response?: { details?: unknown }; code?: number }>;
    }>(`/v1/projects/${encodeURIComponent(client.projectId)}/requests`, {
      query: query({
        start: isoDate(p.start, "start"),
        end: isoDate(p.end, "end"),
        status: p.status,
        request_id: p.requestId,
        endpoint: p.endpoint,
        limit,
        page: page > 0 ? page : undefined,
      }),
    });

    const requests = body?.requests ?? [];
    const failedCount = requests.filter((r) => Number(r?.code ?? 200) >= 400).length;
    ctx.log("info", "read Deepgram requests", { count: requests.length, failedCount });
    return { ...body, requests, count: requests.length, failedCount };
  },
};

export default action;
