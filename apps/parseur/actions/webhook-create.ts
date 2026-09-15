import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, ParseurClient } from "../lib/client.ts";
import { webhookCategoryOptions, webhookEventOptions } from "../lib/params.ts";

/**
 * `POST /webhook` — register a webhook.
 *
 * Unlike Apify's webhook API, Parseur's `Webhook` schema documents no
 * idempotency-key field of any kind, so `idempotent: false`: a retried step
 * creates a second webhook rather than returning the first.
 *
 * `parser_field_set` only applies to `event: "table.processed"`, per the
 * schema's own description — it names the table-type parser fields whose
 * rows fire this webhook. It is a no-op for every other event type.
 *
 * A created webhook is registered but not yet attached to any mailbox —
 * `webhook-enable` attaches it.
 */
interface Input {
  event: string;
  target: string;
  name?: string;
  category?: string;
  headers?: unknown;
  parserFieldSet?: string[] | string;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Register a webhook. Use Enable Webhook afterwards to attach it to a mailbox.",
  idempotent: false,
  params: [
    { key: "event", label: "Event", type: "select", required: true, options: webhookEventOptions },
    {
      key: "target",
      label: "Target URL",
      type: "string",
      required: true,
      hint: "Parseur POSTs the parsed JSON here when the event fires.",
    },
    { key: "name", label: "Name", type: "string" },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: webhookCategoryOptions,
      default: "CUSTOM",
    },
    {
      key: "headers",
      label: "Extra headers",
      type: "json",
      secret: true,
      hint: "Object of extra headers to send with the webhook request, e.g. for a bearer token " +
        "the receiving service expects.",
    },
    {
      key: "parserFieldSet",
      label: "Table fields",
      type: "multiselect",
      hint: 'Only used for the "Table processed" event — the table-type field IDs (start with ' +
        "PF) whose rows should fire this webhook.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Webhook ID" },
    { key: "event", type: "string", label: "Event" },
    { key: "target", type: "string", label: "Target URL" },
    { key: "category", type: "string", label: "Category" },
  ],

  execute(input, ctx) {
    const headers = asOptionalJson<Record<string, unknown>>(input.headers, "Extra headers");
    const parserFieldSet = input.parserFieldSet === undefined
      ? undefined
      : Array.isArray(input.parserFieldSet)
      ? input.parserFieldSet
      : String(input.parserFieldSet).split(",").map((s) => s.trim()).filter(Boolean);

    return new ParseurClient(ctx).request("/webhook", {
      method: "POST",
      body: compact({
        event: input.event,
        target: input.target,
        name: input.name,
        category: input.category,
        headers,
        parser_field_set: parserFieldSet?.length ? parserFieldSet : undefined,
      }),
    });
  },
};

export default webhookCreate;
