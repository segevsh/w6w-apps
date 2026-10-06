import type { ActionDefinition } from "@w6w/types";
import { LodgifyClient } from "../lib/client.ts";

/** List webhook subscriptions. Wraps `GET /webhooks/v1/list`; array of `{id, event, url}`. */
const action: ActionDefinition = {
  key: "list-webhooks",
  type: "read",
  resource: "webhook",
  title: "List webhooks",
  description: "List the account's webhook subscriptions.",
  params: [],
  output: [{ key: "items", type: "array", label: "Webhooks (id, event, url)" }],

  async execute(_input, ctx) {
    return await new LodgifyClient(ctx).list("/webhooks/v1/list");
  },
};

export default action;
