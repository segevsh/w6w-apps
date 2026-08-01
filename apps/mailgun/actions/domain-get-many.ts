import type { ActionDefinition } from "@w6w/types";
import { MailgunClient } from "../lib/client.ts";

/**
 * `GET /v4/domains` — the account's sending domains.
 * Source: https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/domains/get-v4-domains
 *
 * No `domain` param — this action IS the domain listing, so there is nothing
 * to scope it to.
 */
const action: ActionDefinition = {
  key: "domain-get-many",
  type: "read",
  resource: "domain",
  title: "List domains",
  description: "List the account's sending domains.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "Max 1000." },
    { key: "skip", label: "Skip", type: "number", default: 0 },
    {
      key: "state",
      label: "State",
      type: "select",
      hint: "Leave unset to return domains in every state.",
      options: [
        { value: "active", label: "Active" },
        { value: "unverified", label: "Unverified" },
        { value: "disabled", label: "Disabled" },
      ],
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new MailgunClient(ctx);
    return await client.request("/v4/domains", {
      query: {
        limit: typeof p.limit === "number" ? p.limit : undefined,
        skip: typeof p.skip === "number" ? p.skip : undefined,
        state: typeof p.state === "string" ? p.state : undefined,
      },
    });
  },
};

export default action;
