import type { ActionDefinition } from "@w6w/types";
import { MailgunClient } from "../lib/client.ts";

/**
 * `GET /v3/{domain}/bounces` — the domain's bounce suppression list (permanent
 * delivery failures Mailgun will no longer retry).
 * Source: https://help.mailgun.com/hc/en-us/articles/360012287493-Suppressions-Bounces-Complaints-Unsubscribes-Allowlists
 */
const action: ActionDefinition = {
  key: "bounce-get-many",
  type: "read",
  resource: "bounce",
  title: "List bounces",
  description: "List addresses on the domain's bounce suppression list.",
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
    return await client.request(`/v3/${encodeURIComponent(domain)}/bounces`, {
      query: { limit: typeof p.limit === "number" ? p.limit : undefined },
    });
  },
};

export default action;
