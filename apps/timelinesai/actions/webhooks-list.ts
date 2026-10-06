import type { ActionDefinition } from "@w6w/types";
import { TimelinesClient } from "../lib/client.ts";

type Input = Record<string, never>;

const webhooksList: ActionDefinition<Input> = {
  key: "webhooks-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "The workspace's webhook subscriptions (GET /webhooks).",
  params: [],
  output: [
    { key: "data", type: "array", label: "Webhooks: id, event_type, url, enabled, errors_counter" },
  ],

  execute(_input, ctx) {
    return new TimelinesClient(ctx).get("/webhooks");
  },
};

export default webhooksList;
