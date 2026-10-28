import type { ActionDefinition } from "@w6w/types";
import { FacebookClient } from "../lib/client.ts";

interface Input {
  pageId: string;
  metric: string;
  period?: "day" | "week" | "days_28" | "month" | "lifetime" | "total_over_range";
  since?: string;
  until?: string;
}

interface InsightValue {
  value: unknown;
  end_time?: string;
}

interface InsightMetric {
  name: string;
  period: string;
  values: InsightValue[];
  title?: string;
  description?: string;
}

interface InsightsResponse {
  data: InsightMetric[];
}

/**
 * Read Page insights (analytics) — `GET /{page-id}/insights`. `metric` is
 * required by the API (omitting it errors with code 3001) and takes a
 * comma-separated list of metric names — common ones: `page_impressions`,
 * `page_impressions_unique`, `page_post_engagements`, `page_fans`,
 * `page_video_views`. `since`/`until` together are capped at 90 days by the
 * API. Requires the `read_insights` scope.
 */
const getPageInsights: ActionDefinition<Input, InsightsResponse> = {
  key: "get-page-insights",
  type: "read",
  resource: "insight",
  title: "Get Page Insights",
  description: "Read Page-level analytics metrics.",
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true },
    {
      key: "metric",
      label: "Metric(s)",
      type: "string",
      required: true,
      hint:
        "Comma-separated Graph API metric names, e.g. page_impressions,page_post_engagements,page_fans.",
    },
    {
      key: "period",
      label: "Period",
      type: "select",
      default: "day",
      options: [
        { value: "day", label: "Day" },
        { value: "week", label: "Week" },
        { value: "days_28", label: "28 days" },
        { value: "month", label: "Month" },
        { value: "lifetime", label: "Lifetime" },
        { value: "total_over_range", label: "Total over range" },
      ],
    },
    {
      key: "since",
      label: "Since",
      type: "string",
      hint: "Unix timestamp or YYYY-MM-DD. Combined with Until, capped at 90 days.",
    },
    { key: "until", label: "Until", type: "string", hint: "Unix timestamp or YYYY-MM-DD." },
  ],
  output: [{ key: "data", type: "array", label: "Metrics" }],

  execute(input, ctx) {
    const client = new FacebookClient(ctx);
    return client.request<InsightsResponse>(`/${input.pageId}/insights`, {
      params: {
        metric: input.metric,
        period: input.period ?? "day",
        since: input.since,
        until: input.until,
      },
    });
  },
};

export default getPageInsights;
