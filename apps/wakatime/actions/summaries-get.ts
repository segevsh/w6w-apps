import type { ActionDefinition } from "@w6w/types";
import { USER, WakaClient } from "../lib/client.ts";

interface Input {
  start?: string;
  end?: string;
  range?: string;
  project?: string;
  branches?: string;
  timeout?: number;
  writesOnly?: boolean;
  timezone?: string;
}

/** `GET /api/v1/users/current/summaries` */
const summariesGet: ActionDefinition<Input> = {
  key: "summaries-get",
  type: "read",
  resource: "summary",
  title: "Get Summaries",
  description:
    "Daily coding summaries for a date range, segmented by day, with per-project, language and editor breakdowns. Give start and end, or a named range.",
  params: [
    {
      key: "start",
      label: "Start date",
      type: "date",
      hint: "YYYY-MM-DD. Required unless Range is given.",
    },
    {
      key: "end",
      label: "End date",
      type: "date",
      hint: "YYYY-MM-DD. Required unless Range is given.",
    },
    {
      key: "range",
      label: "Named range",
      type: "select",
      hint: "Alternative to start/end.",
      options: [
        "Today",
        "Yesterday",
        "Last 7 Days",
        "Last 7 Days from Yesterday",
        "Last 14 Days",
        "Last 30 Days",
        "This Week",
        "Last Week",
        "This Month",
        "Last Month",
      ].map((v) => ({ value: v, label: v })),
    },
    { key: "project", label: "Project", type: "string", hint: "Only time logged to this project." },
    { key: "branches", label: "Branches", type: "string", hint: "Comma-separated branch names." },
    {
      key: "timeout",
      label: "Keystroke timeout (minutes)",
      type: "number",
      hint: "Defaults to the user's own setting.",
      validation: { min: 1, integer: true },
    },
    {
      key: "writesOnly",
      label: "Writes only",
      type: "boolean",
      hint: "Count only file writes. Defaults to the user's own setting.",
    },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      hint: "Olson name, e.g. Europe/Berlin. Defaults to the user's timezone.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "One summary per day" },
    { key: "start", type: "string", label: "Start of the range (ISO 8601)" },
    { key: "end", type: "string", label: "End of the range (ISO 8601)" },
  ],

  execute(input, ctx) {
    if (!input.range && !(input.start && input.end)) {
      throw new Error("Give a start and an end date, or a named range");
    }
    return new WakaClient(ctx).request("GET", `${USER}/summaries`, {
      query: {
        start: input.start,
        end: input.end,
        range: input.range,
        project: input.project,
        branches: input.branches,
        timeout: input.timeout,
        writes_only: input.writesOnly,
        timezone: input.timezone,
      },
    });
  },
};

export default summariesGet;
