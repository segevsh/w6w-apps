import type { ActionDefinition } from "@w6w/types";
import { AhrefsClient, country } from "../lib/client.ts";

interface Input {
  target: string;
  date: string;
  mode?: string;
  protocol?: string;
  country?: string;
  volumeMode?: string;
  trafficMode?: string;
}

/** `GET /site-explorer/metrics` — response key `metrics`. */
const metricsGet: ActionDefinition<Input> = {
  key: "metrics-get",
  type: "read",
  resource: "domain",
  title: "Get Site Metrics",
  description: "Organic and paid keyword, traffic and cost totals for a target on a date.",
  params: [
    {
      key: "target",
      label: "Target",
      type: "string",
      required: true,
      hint: "The domain or URL to analyse, e.g. `example.com` or `example.com/blog/`.",
    },
    {
      key: "date",
      label: "Date",
      type: "string",
      required: true,
      hint: "Report date, `YYYY-MM-DD`.",
    },
    {
      key: "mode",
      label: "Scope",
      type: "select",
      hint: "How the target is matched. Omit for Ahrefs' default (`subdomains`).",
      options: [{ value: "exact", label: "Exact URL" }, { value: "prefix", label: "Path prefix" }, {
        value: "domain",
        label: "Domain (no subdomains)",
      }, { value: "subdomains", label: "Domain and subdomains" }],
    },
    {
      key: "protocol",
      label: "Protocol",
      type: "select",
      hint: "Which protocol of the target to include. Omit for `both`.",
      options: [{ value: "both", label: "Both" }, { value: "http", label: "HTTP" }, {
        value: "https",
        label: "HTTPS",
      }],
    },
    {
      key: "country",
      label: "Country",
      type: "string",
      hint:
        "Two-letter ISO 3166-1 country code, e.g. `us`. Omit to sum across all countries (where optional).",
    },
    {
      key: "volumeMode",
      label: "Volume mode",
      type: "select",
      hint: "How search volume is calculated. Omit for Ahrefs' default.",
      options: [{ value: "monthly", label: "Monthly" }, { value: "average", label: "Average" }],
    },
    {
      key: "trafficMode",
      label: "Traffic mode",
      type: "select",
      hint: "How organic traffic is calculated. Omit for Ahrefs' default.",
      options: [{ value: "static", label: "Static" }, { value: "adaptive", label: "Adaptive" }],
    },
  ],
  output: [
    { key: "metrics", type: "object", label: "Organic and paid metrics" },
    { key: "unitsCost", type: "number", label: "API units this call consumed" },
    { key: "rows", type: "number", label: "Rows returned" },
  ],

  execute(input, ctx) {
    return new AhrefsClient(ctx).report("/site-explorer/metrics", {
      target: input.target,
      date: input.date,
      mode: input.mode,
      protocol: input.protocol,
      country: country(input.country),
      volume_mode: input.volumeMode,
      traffic_mode: input.trafficMode,
    });
  },
};

export default metricsGet;
