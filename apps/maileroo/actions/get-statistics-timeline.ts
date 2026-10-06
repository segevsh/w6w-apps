import type { ActionDefinition } from "@w6w/types";
import { MailerooClient } from "../lib/client.ts";

/** `GET /v1/statistics/timeline` (scope `statistics.read`) — one point per day, last month. */
const getStatisticsTimeline: ActionDefinition = {
  key: "get-statistics-timeline",
  type: "read",
  resource: "statistics",
  title: "Get Statistics Timeline",
  description: "Daily sending statistics for the last month, one entry per day, each with " +
    "aggregate counts and per-country opens and clicks. Account API Key (statistics.read).",
  params: [],
  output: [{
    key: "days",
    type: "array",
    label: "Entries of { date (YYYY-MM-DD), summary: { aggregate, country_data } }",
  }],

  async execute(_input, ctx) {
    const { data } = await new MailerooClient(ctx).account("/statistics/timeline");
    return { days: Array.isArray(data) ? data : [] };
  },
};

export default getStatisticsTimeline;
