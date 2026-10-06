import type { ActionDefinition } from "@w6w/types";
import { PrintNodeClient, stripWebhookSecrets } from "../lib/client.ts";
import { webhookMessageOptions } from "../lib/params.ts";

/**
 * `POST /webhook` — register a target PrintNode notifies about computer and
 * print job state changes. An account may hold at most five webhooks.
 *
 * The vendor answers the FULL webhook list after the change, not the new
 * webhook; the new one is the entry with the highest `webhookId`, returned
 * separately as `webhookId` here. Not idempotent: a retry creates a second
 * webhook (until the limit of five is hit).
 */
interface Input {
  url: string;
  secret: string;
  messages: string[] | string;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Register a webhook target for computer and print job state events.",
  idempotent: false,
  params: [
    { key: "url", label: "Target URL", type: "string", required: true },
    {
      key: "secret",
      label: "Secret",
      type: "secret",
      required: true,
      hint: "Sent to your target with every delivery so you can verify it came from PrintNode.",
    },
    {
      key: "messages",
      label: "Message types",
      type: "multiselect",
      required: true,
      default: ["*"],
      options: webhookMessageOptions,
    },
  ],
  output: [
    { key: "webhookId", type: "number", label: "New webhook id" },
    { key: "items", type: "array", label: "All webhooks after the change" },
  ],
  async execute(input, ctx) {
    const messages = normaliseMessages(input.messages);
    const all = await new PrintNodeClient(ctx).json<Array<{ webhookId?: number }>>("/webhook", {
      method: "POST",
      body: { url: input.url, secret: input.secret, messages },
    });
    const ids = all.map((w) => w.webhookId).filter((n): n is number => typeof n === "number");
    return {
      webhookId: ids.length ? Math.max(...ids) : undefined,
      items: stripWebhookSecrets(all),
    };
  },
};

/** `*` must stand alone — the vendor rejects it mixed with other types. */
export function normaliseMessages(v: string[] | string): string[] {
  const list = (Array.isArray(v) ? v : String(v ?? "").split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  if (list.length === 0) throw new Error("Message types is required");
  if (list.includes("*") && list.length > 1) {
    throw new Error('"*" (every message type) must be the only selection');
  }
  return list;
}

export default webhookCreate;
