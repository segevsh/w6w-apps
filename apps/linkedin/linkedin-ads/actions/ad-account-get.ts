import type { ActionDefinition } from "@w6w/types";
import { bareId, LinkedInAdsClient } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

interface Input {
  accountId: string;
}

/** `GET /rest/adAccounts/{id}` — fetch one Ad Account by its numeric id. */
const adAccountGet: ActionDefinition<Input> = {
  key: "ad-account-get",
  type: "read",
  resource: "ad-account",
  title: "Get Ad Account",
  description: "Fetch one Ad Account by ID.",
  params: [accountIdParam],
  output: [
    { key: "id", type: "number", label: "Account ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "status", type: "string", label: "Status" },
    { key: "type", type: "string", label: "Type" },
    { key: "servingStatuses", type: "array", label: "Serving statuses" },
  ],

  execute(input, ctx) {
    const client = new LinkedInAdsClient(ctx);
    return client.request(`/rest/adAccounts/${bareId(input.accountId)}`);
  },
};

export default adAccountGet;
