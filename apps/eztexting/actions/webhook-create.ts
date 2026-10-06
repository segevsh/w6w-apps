import type { ActionDefinition } from "@w6w/types";
import { compact, EzTextingClient } from "../lib/client.ts";

/**
 * `POST /v1/webhooks/subscriptions` — subscribe a callback URL to an event. The three event types
 * are the schema's own enum; `secret` is the "shared secret for authenticating requests" per the spec — a value the
 * caller chooses for the callback, not an API credential. Answers `201 {id}`.
 */
interface Input {
  type: string;
  callbackUrl: string;
  secret?: string;
  insecureSsl?: boolean;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Subscribe a callback URL to an EZ Texting event.",
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Event",
      type: "select",
      required: true,
      options: [
        { value: "inbound_text.received", label: "Inbound text received" },
        { value: "keyword.opt_in", label: "Keyword opt-in" },
        { value: "contact.created", label: "Contact created" },
      ],
    },
    { key: "callbackUrl", label: "Callback URL", type: "string", required: true },
    {
      key: "secret",
      label: "Shared secret",
      type: "secret",
      hint: "Used by EZ Texting to authenticate callbacks to your URL.",
    },
    {
      key: "insecureSsl",
      label: "Allow self-signed SSL",
      type: "boolean",
      hint: "Default false.",
      advanced: true,
    },
  ],
  output: [{ key: "id", type: "string", label: "Webhook ID" }],

  async execute(input, ctx) {
    const result = await new EzTextingClient(ctx).json<{ id?: string }>("/webhooks/subscriptions", {
      method: "POST",
      body: compact({
        type: input.type,
        callbackUrl: input.callbackUrl,
        secret: input.secret,
        insecureSsl: input.insecureSsl,
      }),
    });
    return { id: result?.id };
  },
};

export default webhookCreate;
