import type { ActionDefinition } from "@w6w/types";
import { csv, InstagramClient, type InstagramListResponse, seg } from "../lib/client.ts";

interface Input {
  mediaId: string;
  metric?: string | string[];
  period?: string;
  breakdown?: string;
}

/**
 * Media-level insights — `GET /{ig-media-id}/insights`. `metric` is comma-separated
 * (`reach`, `views`, `likes`, `comments`, `shares`, `saved`, `total_interactions`;
 * stories add `replies`, `navigation`). Available metrics vary by media type, and a
 * request that includes an unsupported metric fails whole — Meta returns an error
 * rather than a partial result.
 */
const getMediaInsights: ActionDefinition<Input, InstagramListResponse<Record<string, unknown>>> = {
  key: "get-media-insights",
  type: "read",
  resource: "insights",
  title: "Get Media Insights",
  description: "Read metrics for one post, reel or story.",
  params: [
    { key: "mediaId", label: "Media ID", type: "string", required: true },
    {
      key: "metric",
      label: "Metrics",
      type: "string",
      default: "reach,total_interactions",
      hint: "Comma-separated.",
    },
    { key: "period", label: "Period", type: "string" },
    { key: "breakdown", label: "Breakdown", type: "string" },
  ],
  output: [{ key: "data", type: "array", label: "Metrics" }],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<InstagramListResponse<Record<string, unknown>>>(
      `/${seg(input.mediaId)}/insights`,
      {
        params: {
          metric: csv(input.metric) || "reach,total_interactions",
          period: input.period,
          breakdown: input.breakdown,
        },
      },
    );
  },
};

export default getMediaInsights;
