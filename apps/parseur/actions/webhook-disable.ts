import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient } from "../lib/client.ts";
import { mailboxIdParam, webhookIdParam } from "../lib/params.ts";

/**
 * `DELETE /parser/{mailbox_id}/webhook_set/{id}` — detach a webhook from a
 * mailbox, without deleting the webhook registration itself (`webhook-delete`
 * does that).
 *
 * Same response shape as `webhook-enable`: the mailbox's `webhook_set` /
 * `available_webhook_set`, not a Webhook object.
 *
 * `idempotent: true`: disabling an already-disabled webhook leaves it
 * disabled.
 */
interface Input {
  mailboxId: string;
  webhookId: string;
}

interface ParserWebhooks {
  webhook_set?: unknown[];
  available_webhook_set?: unknown[];
}

const webhookDisable: ActionDefinition<Input> = {
  key: "webhook-disable",
  type: "perform",
  resource: "webhook",
  title: "Disable Webhook",
  description: "Detach a webhook from a mailbox without deleting the webhook registration.",
  idempotent: true,
  params: [mailboxIdParam, webhookIdParam],
  output: [
    { key: "webhook_set", type: "array", label: "Webhooks attached to this mailbox" },
    {
      key: "available_webhook_set",
      type: "array",
      label: "All webhooks registered on the account",
    },
  ],

  async execute(input, ctx) {
    const body = await new ParseurClient(ctx).request<ParserWebhooks>(
      `/parser/${encodeId(input.mailboxId)}/webhook_set/${encodeId(input.webhookId)}`,
      { method: "DELETE" },
    );
    return {
      webhook_set: body?.webhook_set ?? [],
      available_webhook_set: body?.available_webhook_set ?? [],
    };
  },
};

export default webhookDisable;
