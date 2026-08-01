import type { ActionDefinition } from "@w6w/types";
import { MailgunClient } from "../lib/client.ts";

/**
 * `GET /v3/{domain}/unsubscribes` — addresses that clicked a Mailgun-generated
 * unsubscribe link.
 * Source: https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/unsubscribe/get-v3--domainid--unsubscribes
 */
const action: ActionDefinition = {
  key: "unsubscribe-get-many",
  type: "read",
  resource: "unsubscribe",
  title: "List unsubscribes",
  description: "List addresses on the domain's unsubscribe suppression list.",
  params: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "mg.example.com",
    },
    { key: "limit", label: "Limit", type: "number", default: 100 },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const domain = String(p.domain ?? "").trim();
    if (!domain) throw new Error("`domain` is required");

    const client = new MailgunClient(ctx);
    return await client.request(`/v3/${encodeURIComponent(domain)}/unsubscribes`, {
      query: { limit: typeof p.limit === "number" ? p.limit : undefined },
    });
  },
};

export default action;
