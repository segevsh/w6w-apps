import type { ActionDefinition } from "@w6w/types";
import { PrintNodeClient, stripWebhookSecrets } from "../lib/client.ts";
import { webhookMessageOptions } from "../lib/params.ts";
import { normaliseMessages } from "./webhook-create.ts";

/**
 * `PATCH /webhook/{id}` — change a webhook. Every field is optional; only the
 * ones sent change. Answers the full webhook list after the change.
 */
interface Input {
  webhookId: number;
  url?: string;
  secret?: string;
  messages?: string[] | string;
}

const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description: "Change a webhook's target URL, secret or message types.",
  idempotent: true,
  params: [
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "From List Webhooks (`webhookId`).",
    },
    { key: "url", label: "Target URL", type: "string" },
    {
      key: "secret",
      label: "Secret",
      type: "secret",
      hint: "Leave empty to keep the current one.",
    },
    {
      key: "messages",
      label: "Message types",
      type: "multiselect",
      options: webhookMessageOptions,
    },
  ],
  output: [{ key: "items", type: "array", label: "All webhooks after the change" }],
  async execute(input, ctx) {
    const id = Number(input.webhookId);
    if (!Number.isInteger(id) || id < 1) throw new Error("Webhook ID must be a positive integer");
    const body: Record<string, unknown> = {};
    if (input.url) body.url = input.url;
    if (input.secret) body.secret = input.secret;
    const hasMessages = Array.isArray(input.messages)
      ? input.messages.length > 0
      : !!input.messages;
    if (hasMessages) body.messages = normaliseMessages(input.messages as string[] | string);
    if (Object.keys(body).length === 0) throw new Error("Nothing to update: set a field");
    const all = await new PrintNodeClient(ctx).json<unknown[]>(`/webhook/${id}`, {
      method: "PATCH",
      body,
    });
    return { items: stripWebhookSecrets(all) };
  },
};

export default webhookUpdate;
