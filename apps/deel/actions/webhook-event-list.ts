import type { ActionDefinition } from "@w6w/types";
import { DeelClient } from "../lib/client.ts";

/**
 * `GET /webhooks/events/types` — verified against Deel's own OpenAPI document
 * (`endpoints.json`, `get-webhook-events`).
 *
 * The list of event names `webhook-create` accepts. Reaching for it beats
 * guessing a name and getting a webhook that never fires.
 */
const action: ActionDefinition = {
  key: "webhook-event-list",
  type: "read",
  resource: "webhook",
  title: "List webhook event types",
  description: "List the events Deel can send to a webhook.",
  params: [],
  output: [{ key: "data", type: "array", label: "Event types" }],

  async execute(_input, ctx) {
    ctx.log("info", "listing Deel webhook event types");
    return await new DeelClient(ctx).request("/webhooks/events/types");
  },
};

export default action;
