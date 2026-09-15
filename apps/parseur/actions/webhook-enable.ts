import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient } from "../lib/client.ts";
import { mailboxIdParam, webhookIdParam } from "../lib/params.ts";

/**
 * `POST /parser/{mailbox_id}/webhook_set/{id}` — attach a registered webhook
 * to a mailbox.
 *
 * The response is the whole **Parser** object (not a Webhook), with the
 * mailbox's `webhook_set` (attached) and `available_webhook_set`
 * (registered-but-not-attached) fields — this action returns only those two,
 * dropping the rest of the mailbox record.
 *
 * `idempotent: true`: enabling an already-enabled webhook leaves it enabled.
 */
interface Input {
  mailboxId: string;
  webhookId: string;
}

interface ParserWebhooks {
  id?: number;
  webhook_set?: unknown[];
  available_webhook_set?: unknown[];
}

const webhookEnable: ActionDefinition<Input> = {
  key: "webhook-enable",
  type: "perform",
  resource: "webhook",
  title: "Enable Webhook",
  description: "Attach a registered webhook to a mailbox.",
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
      { method: "POST" },
    );
    return {
      webhook_set: body?.webhook_set ?? [],
      available_webhook_set: body?.available_webhook_set ?? [],
    };
  },
};

export default webhookEnable;
