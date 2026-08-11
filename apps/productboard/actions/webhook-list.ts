import type { ActionDefinition } from "@w6w/types";
import { type ListResult, ProductboardClient } from "../lib/client.ts";
import { listOutput, pageCursorParam } from "../lib/params.ts";

/**
 * `GET /v2/webhooks` — the workspace's webhook subscriptions.
 *
 * The response is safe to log and safe to hand to the next workflow step: the
 * vendor's `WebhookSubscriptionResponseFields` schema states outright that
 * *"`notification.headers.authorization` is intentionally absent from responses
 * to protect secrets"*, so a subscription's shared secret never comes back once
 * written. That is unusual and worth knowing — several vendors in this pack
 * return live secrets from an ordinary read, and this one does not.
 */
interface Input {
  pageCursor?: string;
}

const webhookList: ActionDefinition<Input, ListResult> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List webhooks",
  description:
    "List webhook subscriptions. The authorization header configured on each one is never " +
    "returned, by design.",
  params: [pageCursorParam],
  output: listOutput,

  execute(input, ctx) {
    return new ProductboardClient(ctx).list("/webhooks", {
      query: { pageCursor: input.pageCursor },
    });
  },
};

export default webhookList;
