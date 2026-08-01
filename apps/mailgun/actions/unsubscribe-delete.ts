import type { ActionDefinition } from "@w6w/types";
import { MailgunClient } from "../lib/client.ts";

/**
 * `DELETE /v3/{domain}/unsubscribes/{address}` — remove one address from the
 * domain's unsubscribe suppression list, so Mailgun will deliver to it again.
 * Source: https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/unsubscribe
 */
const action: ActionDefinition = {
  key: "unsubscribe-delete",
  type: "perform",
  resource: "unsubscribe",
  title: "Remove an unsubscribe",
  description: "Remove an address from the domain's unsubscribe suppression list.",
  idempotent: true,
  params: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "mg.example.com",
    },
    { key: "address", label: "Email Address", type: "string", required: true, default: "" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const domain = String(p.domain ?? "").trim();
    const address = String(p.address ?? "").trim();
    if (!domain) throw new Error("`domain` is required");
    if (!address) throw new Error("`address` is required");

    const client = new MailgunClient(ctx);
    return await client.request(
      `/v3/${encodeURIComponent(domain)}/unsubscribes/${encodeURIComponent(address)}`,
      { method: "DELETE" },
    );
  },
};

export default action;
