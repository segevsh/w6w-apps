import type { ActionDefinition } from "@w6w/types";
import { UscreenClient } from "../lib/client.ts";
import { rangeParams } from "../lib/params.ts";

interface Input {
  userId?: string;
  contentId?: string;
  from?: string;
  to?: string;
}

const watchTimeGet: ActionDefinition<Input> = {
  key: "watch-time-get",
  type: "read",
  resource: "analytics",
  title: "Get Total Watch Time",
  description:
    "Total video watch time (seconds) for a customer, a piece of content, or the whole store, over a date range (default last 12 months).",
  params: [
    {
      "key": "userId",
      "label": "User ID or email",
      "type": "string",
      "hint": "Filter to one customer (id or email).",
    },
    {
      "key": "contentId",
      "label": "Content ID",
      "type": "string",
      "hint": "Filter to one video, collection or live event.",
    },
    ...rangeParams(" Must be within the last 12 months. Default: 12 months ago."),
  ],
  output: [
    { key: "total_watch_time", type: "number", label: "Total watch time" },
  ],

  async execute(input, ctx) {
    return (await new UscreenClient(ctx).call<Record<string, unknown>>(
      "GET",
      "/analytics/videos/views/total_watch_time",
      {
        query: {
          "user_id": input.userId,
          "content_id": input.contentId,
          "from": input.from,
          "to": input.to,
        },
      },
    )) ?? {};
  },
};

export default watchTimeGet;
