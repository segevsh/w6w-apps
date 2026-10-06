import type { ActionDefinition } from "@w6w/types";
import { call, pick } from "../lib/client.ts";
import { blogId, metricParams, metricQueryKeys } from "../lib/params.ts";

type Input = { blogId: string; network: string; metric: string; from: string; to: string } & {
  timezone?: string;
  subject?: string;
  scope?: string;
};

/** `GET /v2/analytics/aggregation`. */
const analyticsAggregation: ActionDefinition<Input> = {
  key: "analytics-aggregation",
  type: "read",
  resource: "analytics",
  title: "Get Metric Total",
  description: "A single aggregated value of a metric for a brand on one network over a period.",
  params: [blogId, ...metricParams],
  output: [{ key: "value", type: "number", label: "Aggregated value" }],

  async execute(input, ctx) {
    const data = await call(ctx, "GET", "/v2/analytics/aggregation", {
      blogId: input.blogId,
      query: pick(input, metricQueryKeys) as Record<string, string>,
    });
    return { value: typeof data === "number" ? data : null };
  },
};

export default analyticsAggregation;
