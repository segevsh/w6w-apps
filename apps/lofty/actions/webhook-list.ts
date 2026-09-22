import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";

/**
 * `GET /v1.0/webhooks` — the team's webhook subscriptions.
 *
 * Answers a bare JSON array (not wrapped in an envelope) of subscriptions,
 * each with `subscribeId`, `teamId`, `listId`, `callbackUrl`, `limit` and
 * `permissionMode`.
 *
 * Worth reading before registering another one: a duplicate subscription is
 * not visible anywhere else, and it means every event is delivered twice.
 */
const action: ActionDefinition = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "List the team's webhook subscriptions (GET /v1.0/webhooks).",
  params: [],
  output: [{ key: "", type: "array", label: "Webhook subscriptions" }],

  execute(_input, ctx) {
    return new LoftyClient(ctx).request("/webhooks");
  },
};

export default action;
