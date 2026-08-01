import type { ActionDefinition } from "@w6w/types";
import { MailgunClient } from "../lib/client.ts";

/**
 * `DELETE /v3/{domain}/complaints/{address}` — remove one address from the
 * domain's spam-complaint suppression list.
 * Source: https://help.mailgun.com/hc/en-us/articles/360012287493-Suppressions-Bounces-Complaints-Unsubscribes-Allowlists
 */
const action: ActionDefinition = {
  key: "complaint-delete",
  type: "perform",
  resource: "complaint",
  title: "Remove a complaint",
  description: "Remove an address from the domain's spam-complaint suppression list.",
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
      `/v3/${encodeURIComponent(domain)}/complaints/${encodeURIComponent(address)}`,
      { method: "DELETE" },
    );
  },
};

export default action;
