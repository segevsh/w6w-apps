import type { ActionDefinition } from "@w6w/types";
import { MailgunClient } from "../lib/client.ts";

/**
 * `GET /v4/address/validate` — Mailgun's email address validation service.
 * Source: https://documentation.mailgun.com/docs/validate/openapi-validate-final/validations/get-v4-address-validate
 *
 * Not domain-scoped — validation is an account-level service that checks an
 * address's syntax and deliverability, not a specific sending domain — so
 * this action carries no `domain` param.
 */
const action: ActionDefinition = {
  key: "email-validate",
  type: "read",
  resource: "email",
  title: "Validate an email address",
  description: "Check whether an email address is well-formed and deliverable.",
  params: [
    { key: "address", label: "Email Address", type: "string", required: true, default: "" },
    {
      key: "providerLookup",
      label: "Provider Lookup",
      type: "boolean",
      default: true,
      hint: "Query the recipient's mail provider for a deeper check.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const address = String(p.address ?? "").trim();
    if (!address) throw new Error("`address` is required");

    const client = new MailgunClient(ctx);
    return await client.request("/v4/address/validate", {
      query: {
        address,
        provider_lookup: typeof p.providerLookup === "boolean" ? p.providerLookup : undefined,
      },
    });
  },
};

export default action;
