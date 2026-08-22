import type { ActionDefinition } from "@w6w/types";
import { GoogleAnalyticsClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1beta/accountSummaries` — verified against Google's Admin API
 * discovery document (`analyticsadmin.accountSummaries.list`).
 *
 * The one endpoint that takes no id at all, and the fastest way to find a
 * property: it returns every account the credential can see with its
 * properties nested inside, in one call. `account-list` and `property-list`
 * each answer half of that and `property-list` needs a parent account first,
 * so this is where a workflow author starts.
 */
const action: ActionDefinition = {
  key: "account-summary-list",
  type: "read",
  resource: "account",
  title: "List accounts and their properties",
  description: "List every account this connection can see, with its GA4 properties nested.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new GoogleAnalyticsClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing GA4 account summaries", { returnAll, limit });

    return await client.adminAll(
      "/accountSummaries",
      "accountSummaries",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
