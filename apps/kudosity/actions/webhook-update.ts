import type { ActionDefinition, Param } from "@w6w/types";
import { encodeId, KudosityClient } from "../lib/client.ts";
import {
  WEBHOOK_OUTPUT,
  WEBHOOK_PARAMS,
  webhookBody,
  type WebhookInput,
} from "./webhook-create.ts";

/**
 * `PUT /v2/webhook/{id}` — a full replace: the vendor resets any field you leave out to its
 * default, so send the whole webhook, not just the change.
 */
interface Input extends WebhookInput {
  id: string;
}

const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description: "Replace a webhook's settings. Fields left out reset to their defaults, so " +
    "supply every setting you want to keep.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Webhook ID",
      type: "string",
      required: true,
      hint: "A UUID.",
    } as Param,
    ...WEBHOOK_PARAMS,
  ],
  output: [...WEBHOOK_OUTPUT],

  async execute(input, ctx) {
    return await new KudosityClient(ctx).json(`/webhook/${encodeId(input.id)}`, {
      method: "PUT",
      body: webhookBody(input),
    });
  },
};

export default webhookUpdate;
