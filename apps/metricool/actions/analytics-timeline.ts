import type { ActionDefinition } from "@w6w/types";
import { call, pick } from "../lib/client.ts";
import { blogId, metricParams, metricQueryKeys } from "../lib/params.ts";

type Input = { blogId: string; network: string; metric: string; from: string; to: string } & {
  timezone?: string;
  subject?: string;
  scope?: string;
};

/** `GET /v2/analytics/timelines`. */
const analyticsTimeline: ActionDefinition<Input> = {
  key: "analytics-timeline",
  type: "read",
  resource: "analytics",
  title: "Get Metric Timeline",
  description: "A metric's time series for a brand on one network over a period.",
  params: [blogId, ...metricParams],
  output: [
    {
      key: "items",
      type: "array",
      label: "Series: {metric, values: [{dateTime, value}], aggregate}",
    },
    { key: "count", type: "number", label: "Number of series" },
  ],

  async execute(input, ctx) {
    const data = await call(ctx, "GET", "/v2/analytics/timelines", {
      blogId: input.blogId,
      query: pick(input, metricQueryKeys) as Record<string, string>,
    });
    const items = Array.isArray(data) ? data : [];
    return { items, count: items.length };
  },
};

export default analyticsTimeline;
