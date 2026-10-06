import type { Param } from "@w6w/types";
import { asOptionalJson, compact } from "./client.ts";

/** Fields shared by watch create, test and update (Watch API docs, "Create a watch"). */
export interface WatchInput {
  url?: string;
  name?: string;
  intervalMinutes?: number;
  diffMode?: string;
  threshold?: number;
  webhookUrl?: string;
  notifyEmail?: string;
  paused?: boolean;
  aiSummary?: boolean;
  renderParams?: unknown;
}

export const WATCH_PARAMS: Param[] = [
  { key: "name", label: "Name", type: "string", hint: "Label, up to 120 chars." },
  {
    key: "intervalMinutes",
    label: "Interval (minutes)",
    type: "number",
    hint: "5–43200, default 1440. Floors per plan: Free 1440, Basic 180, Starter 60, Pro 30.",
  },
  {
    key: "diffMode",
    label: "Diff mode",
    type: "select",
    options: ["both", "visual", "text"].map((v) => ({ value: v, label: v })),
    hint: "both (default) alerts on a visual or a text change.",
  },
  {
    key: "threshold",
    label: "Visual threshold",
    type: "number",
    hint: "0–1, default 0.01. 0.06 or more only alerts on a major visual change.",
  },
  {
    key: "webhookUrl",
    label: "Webhook URL",
    type: "string",
    hint: "HTTPS endpoint for signed watch.changed/recovered/error POSTs. Starter plan and up.",
  },
  {
    key: "notifyEmail",
    label: "Notify email",
    type: "string",
    hint: "Must be the account's own email; omit to use it.",
  },
  { key: "aiSummary", label: "AI summary", type: "boolean", hint: "Pro and Enterprise only." },
  {
    key: "renderParams",
    label: "Render parameters",
    type: "json",
    hint: "JSON of capture params plus selector, ignoreRegions, ignoreText, minTextChars, " +
      'suppressWhilePresent, uaMode, e.g. {"selector": ".price"}.',
  },
];

export function watchBody(input: WatchInput): Record<string, unknown> {
  return compact({
    url: input.url,
    name: input.name,
    intervalMinutes: input.intervalMinutes,
    diffMode: input.diffMode,
    threshold: input.threshold,
    webhookUrl: input.webhookUrl,
    notifyEmail: input.notifyEmail,
    paused: input.paused,
    aiSummary: input.aiSummary,
    renderParams: asOptionalJson(input.renderParams, "Render parameters"),
  });
}

/**
 * The docs show request bodies and the webhook payload but no sample response for the watch
 * routes, so only the envelope's `meta` is declared; the watch object itself is returned
 * exactly as the API sends it.
 */
export const WATCH_OUTPUT = [
  { key: "meta", type: "object", label: "Request id and credit usage" },
] as const;
