import type { ActionDefinition } from "@w6w/types";
import { csv, InstagramClient, type InstagramListResponse, seg } from "../lib/client.ts";

interface Input {
  igUserId: string;
  metric?: string | string[];
  period?: string;
  metricType?: "total_value" | "time_series";
  breakdown?: string;
  timeframe?: string;
  since?: string | number;
  until?: string | number;
}

/**
 * Account-level insights — `GET /{ig-user-id}/insights`. `metric` is comma-separated
 * (`reach`, `views`, `accounts_engaged`, `likes`, `comments`, `shares`, `saves`,
 * `total_interactions`, `follower_demographics`, ...); `impressions` is deprecated.
 * `period` is `day` (or `lifetime` for demographics); `metric_type` is `total_value`
 * or `time_series`; `breakdown` and `timeframe` apply to demographics-style metrics.
 * `since`/`until` accept Unix timestamps or date strings. Needs 100+ followers for
 * demographics.
 */
const getAccountInsights: ActionDefinition<Input, InstagramListResponse<Record<string, unknown>>> =
  {
    key: "get-account-insights",
    type: "read",
    resource: "insights",
    title: "Get Account Insights",
    description: "Read account-level metrics such as reach, views and engagement.",
    params: [
      { key: "igUserId", label: "Instagram Account ID", type: "string", required: true },
      {
        key: "metric",
        label: "Metrics",
        type: "string",
        default: "reach",
        hint: "Comma-separated, e.g. reach,views,accounts_engaged.",
      },
      { key: "period", label: "Period", type: "string", default: "day" },
      {
        key: "metricType",
        label: "Metric type",
        type: "select",
        default: "total_value",
        options: [
          { value: "total_value", label: "Total value" },
          { value: "time_series", label: "Time series" },
        ],
      },
      { key: "breakdown", label: "Breakdown", type: "string", hint: "e.g. age, city, country." },
      { key: "timeframe", label: "Timeframe", type: "string", hint: "e.g. last_30_days." },
      { key: "since", label: "Since", type: "string" },
      { key: "until", label: "Until", type: "string" },
    ],
    output: [{ key: "data", type: "array", label: "Metrics" }],

    execute(input, ctx) {
      return new InstagramClient(ctx).request<InstagramListResponse<Record<string, unknown>>>(
        `/${seg(input.igUserId)}/insights`,
        {
          params: {
            metric: csv(input.metric) || "reach",
            period: input.period || "day",
            metric_type: input.metricType ?? "total_value",
            breakdown: input.breakdown,
            timeframe: input.timeframe,
            since: input.since,
            until: input.until,
          },
        },
      );
    },
  };

export default getAccountInsights;
