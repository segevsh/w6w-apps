import type { ActionDefinition } from "@w6w/types";
import { AudiencesClient, type GraphListResponse } from "../lib/client.ts";

interface Input {
  limit?: number;
  cursor?: string;
}

interface AdAccount {
  id: string;
  account_id?: string;
  name?: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
  business_name?: string;
}

const FIELDS = "id,account_id,name,account_status,currency,timezone_name,business_name";

/**
 * `GET /me/adaccounts` — the ad accounts the connected user can reach. This is
 * the User → `adaccounts` edge; Meta's own Business SDK exposes it as
 * `User.get_ad_accounts` (`endpoint='/adaccounts'`, no edge parameters). The
 * rendered reference page for the edge is not reachable by crawler, so the
 * field list is the intersection of the SDK's `AdAccount` fields.
 */
const listAdAccounts: ActionDefinition<Input, GraphListResponse<AdAccount>> = {
  key: "list-ad-accounts",
  type: "read",
  resource: "ad-account",
  title: "List Ad Accounts",
  description:
    "List the ad accounts the connected Facebook user can access. Use `account_id` (or `id`) as the Ad Account ID of every other action.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 25,
      validation: { min: 1, max: 100, integer: true },
    },
    { key: "cursor", label: "Cursor", type: "string", hint: "`after` cursor from a prior page." },
  ],
  output: [
    { key: "data", type: "array", label: "Ad accounts" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  async execute(input, ctx) {
    return await new AudiencesClient(ctx).request<GraphListResponse<AdAccount>>("/me/adaccounts", {
      params: { fields: FIELDS, limit: input.limit ?? 25, after: input.cursor },
    });
  },
};

export default listAdAccounts;
