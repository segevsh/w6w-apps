import type { ActionDefinition } from "@w6w/types";
import { EnchargeClient } from "../lib/client.ts";

/**
 * Get Account Info — `GET /v1/accounts/info`. Verified against the OpenAPI document (`GetInfo`),
 * fetched 2026-10-06: `peopleCount`, `status`, `timezone`, `activeServices`, `site`, `name`,
 * `accountId`. No credential is echoed.
 */
// deno-lint-ignore no-empty-interface
interface Input {}

const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account Info",
  description: "Read the account's name, id, status, timezone, site, active services and " +
    "people count.",
  params: [],
  output: [
    { key: "accountId", type: "string", label: "Account ID" },
    { key: "name", type: "string", label: "Account name" },
    { key: "status", type: "string", label: "Account status" },
    { key: "timezone", type: "string", label: "Timezone" },
    { key: "site", type: "string", label: "Site" },
    { key: "peopleCount", type: "number", label: "Number of people" },
    { key: "activeServices", type: "array", label: "Active services" },
  ],

  async execute(_input, ctx) {
    return await new EnchargeClient(ctx).request("GET", "/accounts/info");
  },
};

export default accountGet;
