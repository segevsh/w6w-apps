import type { ActionDefinition } from "@w6w/types";
import { PlivoClient } from "../lib/client.ts";

/**
 * `GET /v1/Account/{auth_id}/` — account type, billing mode, `cash_credits`
 * (USD balance), `auto_recharge`, timezone and contact details. The documented
 * object carries no credential material, so it is returned as-is.
 */
const getAccount: ActionDefinition<Record<string, never>> = {
  key: "get-account",
  type: "read",
  resource: "account",
  title: "Get Account Details",
  description: "Retrieve the account's details, including its credit balance.",
  params: [],

  output: [
    { key: "auth_id", type: "string", label: "Auth ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "account_type", type: "string", label: "Account type" },
    { key: "billing_mode", type: "string", label: "Billing mode" },
    { key: "cash_credits", type: "string", label: "Credit balance (USD)" },
    { key: "auto_recharge", type: "boolean", label: "Auto-recharge enabled" },
    { key: "timezone", type: "string", label: "Time zone" },
    { key: "city", type: "string", label: "City" },
    { key: "state", type: "string", label: "State" },
    { key: "address", type: "string", label: "Address" },
  ],

  execute(_input, ctx) {
    return new PlivoClient(ctx).request("");
  },
};

export default getAccount;
