import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, pick } from "../lib/client.ts";
import { blogId, metricParams, metricQueryKeys, str } from "../lib/params.ts";

type Input = {
  blogId: string;
  competitorId: string;
  network: string;
  metric: string;
  from: string;
  to: string;
  timezone?: string;
  subject?: string;
  scope?: string;
};

/** `GET /v2/analytics/competitors/{competitorId}/timelines`. */
const competitorTimeline: ActionDefinition<Input> = {
  key: "competitor-timeline",
  type: "read",
  resource: "competitor",
  title: "Get Competitor Timeline",
  description: "A competitor's metric time series over a period.",
  params: [
    blogId,
    str("competitorId", "Competitor ID", { required: true, hint: "An id from List Competitors." }),
    ...metricParams,
  ],
  output: [
    {
      key: "items",
      type: "array",
      label: "Series: {metric, values: [{dateTime, value}], aggregate}",
    },
    { key: "count", type: "number", label: "Number of series" },
  ],

  async execute(input, ctx) {
    const data = await call(
      ctx,
      "GET",
      `/v2/analytics/competitors/${encodeId(input.competitorId)}/timelines`,
      { blogId: input.blogId, query: pick(input, metricQueryKeys) as Record<string, string> },
    );
    const items = Array.isArray(data) ? data : [];
    return { items, count: items.length };
  },
};

export default competitorTimeline;
