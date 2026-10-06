import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient } from "../lib/client.ts";

/** `GET /v1/metrics` — Daily summary of every core metric (MRR, ARR, customers, churn, LTV and more) over a date range. */
interface Input {
  start_date: string;
  end_date: string;
}

const metricsSummary: ActionDefinition<Input> = {
  key: "metrics-summary",
  type: "read",
  resource: "metric",
  title: "Get Metrics Summary",
  description:
    "Daily summary of every core metric (MRR, ARR, customers, churn, LTV and more) over a date range.",
  params: [
    {
      key: "start_date",
      label: "Start date",
      type: "string",
      required: true,
      hint: "YYYY-MM-DD.",
      validation: { pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    },
    {
      key: "end_date",
      label: "End date",
      type: "string",
      required: true,
      hint: "YYYY-MM-DD.",
      validation: { pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    },
  ],
  output: [
    { key: "metrics", type: "array", label: "One row per day" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request("GET", "/metrics", {
      query: { start_date: input.start_date, end_date: input.end_date },
    });
  },
};

export default metricsSummary;
