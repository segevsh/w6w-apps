import type { ActionDefinition } from "@w6w/types";
import { stripWebhookSecret, WebexClient } from "../lib/client.ts";

interface Input {
  max?: number;
  ownedByOrg?: boolean;
}

const listWebhooks: ActionDefinition<Input> = {
  key: "list-webhooks",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "List webhooks the connected person created, or the org's admin-level webhooks.",
  params: [
    {
      key: "max",
      label: "Max results",
      type: "number",
      default: 50,
      validation: { min: 1, integer: true },
    },
    {
      key: "ownedByOrg",
      label: "Org-owned only",
      type: "boolean",
      hint: "Limit to org/admin-level webhooks.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "resource", type: "string", label: "Resource" },
    { key: "event", type: "string", label: "Event" },
  ],

  async execute(input, ctx) {
    const client = new WebexClient(ctx);
    const res = await client.request<{ items: unknown[] }>("/webhooks", {
      query: { max: input.max, ownedBy: input.ownedByOrg ? "org" : undefined },
    });
    // See stripWebhookSecret: Webex's own schema echoes the payload-signing
    // secret on every list item.
    return (res.items ?? []).map(stripWebhookSecret);
  },
};

export default listWebhooks;
