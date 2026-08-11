import type { ActionDefinition } from "@w6w/types";
import { FilloutClient } from "../lib/client.ts";

/**
 * `POST /v1/api/webhook/delete` — unsubscribe a webhook.
 *
 * A `POST`, not a `DELETE`, and the id travels in the body as `webhookId`.
 *
 * ## `webhookId` is a string here and an integer there
 *
 * Fillout's `RemoveWebhookRequest` schema declares
 * `webhookId: {type: string}`, while the Create Webhook response declares
 * `id: {type: integer}`. Passing the integer you were just handed is therefore
 * the one thing the delete schema does not accept. This action coerces
 * whatever it is given with `String(...)`, so both the raw `id` and the
 * pre-stringified `webhookId` that Create Webhook also returns work.
 *
 * `idempotent: true` — the action names one subscription and the end state
 * after two calls matches the end state after one, so a retry is safe.
 */
interface Input {
  webhookId: string | number;
}

interface Output {
  webhookId: string;
  result: Record<string, unknown>;
}

const webhookDelete: ActionDefinition<Input, Output> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Remove Webhook",
  description: "Unsubscribe a webhook by its ID so it stops receiving submissions.",
  idempotent: true,
  params: [
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "string",
      required: true,
      hint: "The ID Create Webhook returned. Fillout's create response types it as an integer " +
        "and its delete request types it as a string; either is accepted here.",
    },
  ],
  output: [
    { key: "webhookId", type: "string", label: "Removed webhook ID" },
    { key: "result", type: "object", label: "Vendor response body" },
  ],

  async execute(input, ctx) {
    // The schema mismatch, handled once: Create returns an integer, Delete
    // declares a string.
    const webhookId = String(input.webhookId ?? "").trim();
    if (!webhookId) throw new Error("Webhook ID is required");

    const result = await new FilloutClient(ctx).json<Record<string, unknown>>(
      "/webhook/delete",
      { method: "POST", body: { webhookId } },
    );
    ctx.log("info", "removed Fillout webhook", { webhookId });
    return { webhookId, result: result ?? {} };
  },
};

export default webhookDelete;
