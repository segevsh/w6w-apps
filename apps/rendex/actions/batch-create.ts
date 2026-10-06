import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, RendexClient } from "../lib/client.ts";

/**
 * `POST /v1/screenshot/batch` — queue many URLs for asynchronous capture (202). Paid plans
 * only; the URL cap is per plan (Basic 10, Starter 25, Pro 100, Enterprise 500). Returns
 * `batchId`, `totalJobs` and `jobs[{jobId, url, status}]`; poll with `batch-get`. Per-job
 * parameters (url/html/selector/cookies/headers/…) are not accepted in `defaults`.
 */
interface Input {
  urls: unknown;
  defaults?: unknown;
  webhookUrl?: string;
  cacheTtl?: number;
}

function parseUrls(value: unknown): string[] {
  const parsed = typeof value === "string" && value.trim().startsWith("[")
    ? asOptionalJson<unknown>(value, "URLs")
    : value;
  const list = typeof parsed === "string"
    ? parsed.split(/[\n,]+/)
    : Array.isArray(parsed)
    ? parsed
    : [];
  return list.map((u) => String(u).trim()).filter(Boolean);
}

const batchCreate: ActionDefinition<Input> = {
  key: "batch-create",
  type: "perform",
  idempotent: false,
  resource: "batch",
  title: "Create Screenshot Batch",
  description: "Queue many URLs for asynchronous capture with shared settings.",
  params: [
    {
      key: "urls",
      label: "URLs",
      type: "text",
      required: true,
      hint: "One URL per line, or a JSON array. 1–500 depending on plan.",
    },
    {
      key: "defaults",
      label: "Shared settings",
      type: "json",
      hint:
        'JSON of capture settings applied to every URL, e.g. {"format": "png", "fullPage": true}.',
    },
    {
      key: "webhookUrl",
      label: "Webhook URL",
      type: "string",
      hint: "HTTPS URL that receives a batch.completed POST.",
    },
    { key: "cacheTtl", label: "Cache TTL (s)", type: "number", hint: "3600–2592000." },
  ],
  output: [
    { key: "batchId", type: "string", label: "Batch id" },
    { key: "totalJobs", type: "number", label: "Number of jobs" },
    { key: "jobs", type: "array", label: "{jobId, url, status} per URL" },
    { key: "meta", type: "object", label: "Request id and credit usage" },
  ],

  execute(input, ctx) {
    const urls = parseUrls(input.urls);
    if (urls.length === 0) throw new Error("URLs is required");
    const body = compact({
      urls,
      defaults: asOptionalJson(input.defaults, "Shared settings"),
      webhookUrl: input.webhookUrl,
      cacheTtl: input.cacheTtl,
    });
    return new RendexClient(ctx).json("/screenshot/batch", { method: "POST", body });
  },
};

export default batchCreate;
