import type { ActionDefinition } from "@w6w/types";
import { DrataClient } from "../lib/client.ts";

/**
 * `GET /company` — the account's company profile: name, domain, the configured
 * security-training / background-check providers, and the entitlements the account
 * holds. Needs the `Company Settings: Get Company Settings` permission.
 */
const action: ActionDefinition<Record<string, never>> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description:
    "Read the account's company profile — name, domain, training and background-check providers, entitlements.",
  params: [],
  output: [
    { key: "accountId", type: "string", label: "Account ID" },
    { key: "name", type: "string", label: "Company name" },
    { key: "domain", type: "string", label: "Domain" },
    { key: "entitlements", type: "array", label: "Entitlements" },
  ],

  execute(_input, ctx) {
    return new DrataClient(ctx).get("/company");
  },
};

export default action;
