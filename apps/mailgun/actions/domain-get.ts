import type { ActionDefinition } from "@w6w/types";
import { MailgunClient } from "../lib/client.ts";

/**
 * `GET /v4/domains/{name}` — a single sending domain, including its DNS
 * records and DKIM/SPF verification state.
 * Source: https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/domains/get-v4-domains
 */
const action: ActionDefinition = {
  key: "domain-get",
  type: "read",
  resource: "domain",
  title: "Get a domain",
  description: "Get one sending domain's details, including DNS/DKIM verification state.",
  params: [
    { key: "name", label: "Domain", type: "string", required: true, placeholder: "mg.example.com" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const client = new MailgunClient(ctx);
    return await client.request(`/v4/domains/${encodeURIComponent(name)}`);
  },
};

export default action;
