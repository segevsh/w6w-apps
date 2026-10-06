import type { ActionDefinition } from "@w6w/types";
import { seg, USER, WakaClient } from "../lib/client.ts";

interface Input {
  insightType: string;
  range: string;
  timeout?: number;
  writesOnly?: boolean;
}

/** `GET /api/v1/users/current/insights/${seg(input.insightType)}/${seg(input.range)}` */
const insightGet: ActionDefinition<Input> = {
  key: "insight-get",
  type: "read",
  resource: "insight",
  title: "Get Insight",
  description:
    "One insight about coding activity over a range: stats, weekdays, days, best_day, daily_average, projects, languages, editors, categories, machines or operating_systems.",
  params: [
    {
      key: "insightType",
      label: "Insight",
      type: "select",
      required: true,
      options: [
        "stats",
        "weekdays",
        "days",
        "ai_days",
        "best_day",
        "daily_average",
        "projects",
        "languages",
        "editors",
        "categories",
        "machines",
        "operating_systems",
      ].map((v) => ({ value: v, label: v })),
    },
    {
      key: "range",
      label: "Range",
      type: "string",
      required: true,
      hint:
        "last_7_days, last_30_days, last_6_months, last_year, all_time, a year (2026) or a month (2026-09).",
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
    { key: "data", type: "object", label: "The insight, keyed by its type" },
  ],

  execute(input, ctx) {
    return new WakaClient(ctx).request(
      "GET",
      `${USER}/insights/${seg(input.insightType)}/${seg(input.range)}`,
      {
        query: {
          timeout: input.timeout,
          writes_only: input.writesOnly,
        },
      },
    );
  },
};

export default insightGet;
