import type { ActionDefinition } from "@w6w/types";
import { json, StatuspageClient } from "../lib/client.ts";
import { PAGE_PARAM } from "../lib/params.ts";

/**
 * `POST /pages/{page}/metrics/{metric}/data` — publish a number to a graph on
 * the page.
 *
 * The quantitative half of a status page: response time, queue depth, uptime.
 * A metric shows customers that things are *fine*, continuously, which is a
 * different job from an incident telling them things are broken occasionally.
 *
 * ## Timestamps are Unix **seconds**
 *
 * Not milliseconds. A millisecond timestamp lands the point roughly fifty
 * thousand years in the future, where the graph will never show it and nothing
 * will complain — so this action converts an ISO date and rejects anything it
 * cannot read.
 *
 * The metric must already exist and be configured for API submission; this
 * writes points to it, it does not create it.
 */
const action: ActionDefinition = {
  key: "metric-data-add",
  type: "perform",
  resource: "metric",
  title: "Add a metric data point",
  description:
    "Publish a value to a custom metric's graph. Timestamps are Unix SECONDS — milliseconds " +
    "land the point fifty thousand years out, silently.",
  idempotent: false,
  params: [
    {
      key: "metricId",
      label: "Metric ID",
      type: "string",
      required: true,
      default: "",
      hint: "The metric must already exist on the page and be set to accept API data.",
    },
    {
      key: "value",
      label: "Value",
      type: "number",
      required: true,
      default: 0,
    },
    {
      key: "timestamp",
      label: "Timestamp",
      type: "datetime",
      default: "",
      hint: "Defaults to now. Converted to Unix seconds, which is what Statuspage expects.",
    },
    {
      key: "points",
      label: "Multiple Points",
      type: "json",
      default: "",
      advanced: true,
      hint: 'Array of `{"timestamp":1755000000,"value":1.23}` for a backfill — one request ' +
        "instead of many, which matters at one request per second.",
    },
    PAGE_PARAM,
  ],
  output: [
    { key: "ok", type: "boolean", label: "Submitted" },
    { key: "count", type: "number", label: "Points submitted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const metricId = String(p.metricId ?? "").trim();
    if (!metricId) throw new Error("`metricId` is required");

    const explicit = json(p.points, "points");
    let points: Array<{ timestamp: number; value: number }>;

    if (Array.isArray(explicit)) {
      points = explicit as Array<{ timestamp: number; value: number }>;
      if (points.length === 0) throw new Error("`points` is empty");
    } else {
      const raw = String(p.timestamp ?? "").trim();
      let seconds: number;
      if (!raw) {
        seconds = Math.floor(Date.now() / 1000);
      } else if (/^\d+$/.test(raw)) {
        seconds = Number(raw);
      } else {
        const ms = Date.parse(raw);
        if (Number.isNaN(ms)) throw new Error(`\`timestamp\` is not a date: ${raw}`);
        // SECONDS — a millisecond value would land ~50,000 years out.
        seconds = Math.floor(ms / 1000);
      }
      const value = Number(p.value);
      if (!Number.isFinite(value)) throw new Error("`value` must be a number");
      points = [{ timestamp: seconds, value }];
    }

    const client = new StatuspageClient(ctx);
    const pageId = client.pageFor(p.pageId);
    await client.request(
      `/pages/${encodeURIComponent(pageId)}/metrics/${encodeURIComponent(metricId)}/data`,
      { method: "POST", body: { data: points } },
    );
    return { ok: true, count: points.length };
  },
};

export default action;
