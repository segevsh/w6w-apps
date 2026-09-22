import type { ActionDefinition } from "@w6w/types";
import { asStringArray, compact, encodePathSegment, SimpleTextingClient } from "../lib/client.ts";
import { requestPerSecLimitParam, webhookIdParam, webhookTriggerOptions } from "../lib/params.ts";

/**
 * `PUT /api/webhooks/{webhookId}` — "Update a Webhook".
 *
 * Answers `200` with `{id}`. The body is `WebhookRequest`, the same shape Create
 * Webhook takes, and `url` and `triggers` are required here too — this is a
 * whole-subscription write, not a patch, so an update that wants to keep the
 * current target URL has to send it back.
 *
 * The document declares a `404` for this path with the same `ObjectIdDto` body
 * as its `200` — the same spec copy-paste as Create's `400`. Nothing is inferred
 * from it: a `404` surfaces as an error, which is the useful behaviour, since a
 * webhook ID that does not exist means the subscription a workflow thinks it
 * maintains was deleted by someone else.
 *
 * Idempotent: the same body applied twice leaves the same subscription.
 */
interface Input {
  webhookId: string;
  url: string;
  triggers: string[];
  requestPerSecLimit?: number;
  accountPhone?: string;
  contactPhone?: string;
}

const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description: "Replace a webhook's target URL, triggers and scope.",
  idempotent: true,
  params: [
    webhookIdParam,
    {
      key: "url",
      label: "Target URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/simpletexting",
      hint: "Required by the schema even when only the triggers are changing — send the current " +
        "URL back if it should stay as it is.",
    },
    {
      key: "triggers",
      label: "Triggers",
      type: "multiselect",
      required: true,
      options: webhookTriggerOptions,
      hint: "The complete trigger set after this update, not a delta.",
    },
    requestPerSecLimitParam,
    {
      key: "accountPhone",
      label: "Limit to sending number",
      type: "string",
      placeholder: "8005551234",
      hint: "Optional scope. Blank means every number on the account — send a value to narrow it.",
    },
    {
      key: "contactPhone",
      label: "Limit to contact",
      type: "string",
      placeholder: "1234567890",
      hint: "Optional scope: only this contact's events reach the URL.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID (hexadecimal)" },
  ],

  execute(input, ctx) {
    const triggers = asStringArray(input.triggers);
    if (!triggers?.length) throw new Error("At least one trigger is required");

    ctx.log("info", "updating a SimpleTexting webhook", { triggers: triggers.length });
    return new SimpleTextingClient(ctx).json(
      `/api/webhooks/${encodePathSegment(input.webhookId)}`,
      {
        method: "PUT",
        body: compact({
          url: input.url,
          triggers,
          requestPerSecLimit: input.requestPerSecLimit,
          accountPhone: input.accountPhone,
          contactPhone: input.contactPhone,
        }),
      },
    );
  },
};

export default webhookUpdate;
