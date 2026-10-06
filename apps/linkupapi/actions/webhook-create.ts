import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  url?: string;
  events?: string;
  retry?: boolean;
  enableSignature?: boolean;
}

const FIELDS: readonly Field[] = [
  ["accountId", "account_id", "s"],
  ["url", "url", "s"],
  ["events", "events", "m"],
  ["retry", "retry", "b"],
  ["enableSignature", "enable_signature", "b"],
];

const webhookCreate: ActionDefinition<Input, ActionResult> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhooks",
  title: "Create Webhook",
  description:
    "Register a webhook for an account. Omit the URL for a hosted webhook read by polling. With enableSignature the response carries the signing secret once.",
  idempotent: false,
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint: "The account to monitor.",
    },
    {
      key: "url",
      label: "URL",
      type: "string",
      hint: "Public HTTPS endpoint that receives events as POST; omit for a hosted webhook.",
    },
    {
      key: "events",
      label: "Events",
      type: "string",
      hint:
        "Event types, e.g. message_received; accepted_invitation. Default all. Several values separated by a semicolon (;).",
    },
    { key: "retry", label: "Retry failed deliveries", type: "boolean" },
    {
      key: "enableSignature",
      label: "Sign deliveries",
      type: "boolean",
      hint: "HMAC-SHA256; the secret is returned only once.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).request("POST", "/v2/webhooks", {
      body: mapInput(input, FIELDS),
    });
  },
};

export default webhookCreate;
