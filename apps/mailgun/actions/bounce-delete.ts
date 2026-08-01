import type { ActionDefinition } from "@w6w/types";
import { MailgunClient } from "../lib/client.ts";

/**
 * `DELETE /v3/{domain}/bounces/{address}` — remove one address from the
 * domain's bounce suppression list, so Mailgun will attempt delivery again.
 * Source: https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/bounces/delete-v3--domainid--bounces--address-
 */
const action: ActionDefinition = {
  key: "bounce-delete",
  type: "perform",
  resource: "bounce",
  title: "Remove a bounce",
  description: "Remove an address from the domain's bounce suppression list.",
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
      `/v3/${encodeURIComponent(domain)}/bounces/${encodeURIComponent(address)}`,
      { method: "DELETE" },
    );
  },
};

export default action;
