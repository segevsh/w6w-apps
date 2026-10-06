import type { ActionDefinition } from "@w6w/types";
import { seg, USER, WakaClient } from "../lib/client.ts";

interface Input {
  range?: string;
  timeout?: number;
  writesOnly?: boolean;
}

/** `GET /api/v1/users/current/stats[/{range}]` */
const statsGet: ActionDefinition<Input> = {
  key: "stats-get",
  type: "read",
  resource: "stats",
  title: "Get Stats",
  description:
    "Coding activity totals and per-language, editor, project, OS and category breakdowns for a range. A 202 with is_up_to_date false means the range is still being computed.",
  params: [
    {
      key: "range",
      label: "Range",
      type: "string",
      hint:
        "last_7_days, last_30_days, last_6_months, last_year, all_time, a year (2026) or a month (2026-09). Omit for the profile range.",
    },
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
  ],
  output: [
    { key: "data", type: "object", label: "Stats for the range" },
  ],

  execute(input, ctx) {
    return new WakaClient(ctx).request(
      "GET",
      input.range ? `${USER}/stats/${seg(input.range)}` : `${USER}/stats`,
      {
        query: {
          timeout: input.timeout,
          writes_only: input.writesOnly,
        },
      },
    );
  },
};

export default statsGet;
