import type { ActionDefinition } from "@w6w/types";
import { call, requireStr } from "../lib/client.ts";
import { str } from "../lib/params.ts";

type Input = Record<string, unknown>;

const smsAnalytics: ActionDefinition<Input> = {
  key: "sms-analytics",
  type: "read",
  resource: "sms",
  title: "SMS Analytics",
  description:
    "Delivery analytics for SMS sent in a date range (at most 31 days, starting no earlier than 2024-01-01).",
  params: [
    str("startDate", "Start date", { required: true, hint: "YYYY-MM-DD." }),
    str("endDate", "End date", {
      required: true,
      hint: "YYYY-MM-DD, at most 31 days after the start.",
    }),
  ],
  output: [
    { key: "data", type: "array", label: "Per-day rows" },
    { key: "total", type: "object", label: "Totals (delivered, failed, credits, …)" },
  ],

  async execute(input, ctx) {
    const res = await call(ctx, "GET", "/report/analytics/p/sms", {
      query: {
        startDate: requireStr("startDate", input.startDate),
        endDate: requireStr("endDate", input.endDate),
      },
    });
    return { data: res.data ?? [], total: res.total ?? {} };
  },
};

export default smsAnalytics;
