import type { ActionDefinition } from "@w6w/types";
import { MailerooClient } from "../lib/client.ts";

/** `GET /v1/statistics/summary` (scope `statistics.read`) — the current calendar month. */
const getStatisticsSummary: ActionDefinition = {
  key: "get-statistics-summary",
  type: "read",
  resource: "statistics",
  title: "Get Statistics Summary",
  description: "Aggregate sending statistics for the current calendar month (delivered, bounced, " +
    "opens, clicks, suppressions) plus per-country opens and clicks. Account API Key " +
    "(statistics.read).",
  params: [],
  output: [
    { key: "aggregate", type: "object", label: "delivered, bounced, opens, clicks, suppressions" },
    { key: "countryData", type: "object", label: "Country code -> { opens, clicks }" },
  ],

  async execute(_input, ctx) {
    const { data } = await new MailerooClient(ctx).account("/statistics/summary");
    const d = (data ?? {}) as Record<string, unknown>;
    return { aggregate: d.aggregate, countryData: d.country_data };
  },
};

export default getStatisticsSummary;
