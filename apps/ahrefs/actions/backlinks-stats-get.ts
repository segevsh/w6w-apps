import type { ActionDefinition } from "@w6w/types";
import { AhrefsClient } from "../lib/client.ts";

interface Input {
  target: string;
  date: string;
  mode?: string;
  protocol?: string;
}

/** `GET /site-explorer/backlinks-stats` — response key `metrics`. */
const backlinksStatsGet: ActionDefinition<Input> = {
  key: "backlinks-stats-get",
  type: "read",
  resource: "backlink",
  title: "Get Backlinks Stats",
  description: "Live and all-time backlink and referring-domain counts for a target.",
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
  ],
  output: [
    { key: "metrics", type: "object", label: "Backlink counts" },
    { key: "unitsCost", type: "number", label: "API units this call consumed" },
    { key: "rows", type: "number", label: "Rows returned" },
  ],

  execute(input, ctx) {
    return new AhrefsClient(ctx).report("/site-explorer/backlinks-stats", {
      target: input.target,
      date: input.date,
      mode: input.mode,
      protocol: input.protocol,
    });
  },
};

export default backlinksStatsGet;
