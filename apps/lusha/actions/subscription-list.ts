import type { ActionDefinition } from "@w6w/types";
import { LushaClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
}

const action: ActionDefinition<Input> = {
  key: "subscription-list",
  type: "read",
  resource: "subscription",
  title: "List Webhook Subscriptions",
  description: "Webhook subscriptions for signal notifications, newest first.",
  params: [
    { key: "limit", label: "Limit", type: "number", hint: "1-100." },
    { key: "offset", label: "Offset", type: "number" },
  ],
  output: [
    { key: "data", type: "array", label: "Subscriptions" },
    { key: "pagination", type: "object", label: "total, limit, offset, hasMore" },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request("GET", `/api/subscriptions`, {
      query: { limit: input.limit, offset: input.offset },
    });
  },
};

export default action;
