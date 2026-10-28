import type { ActionDefinition } from "@w6w/types";
import { GoogleAnalyticsClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1beta/accounts` — verified against Google's Admin API discovery
 * document (`analyticsadmin.accounts.list`).
 */
const action: ActionDefinition = {
  key: "account-list",
  type: "read",
  resource: "account",
  title: "List accounts",
  description: "List the Google Analytics accounts this connection can see.",
  params: [
    ...LIST_PARAMS,
    {
      key: "showDeleted",
      label: "Include Trashed",
      type: "boolean",
      default: false,
      hint: "Include soft-deleted accounts, which can still be restored.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new GoogleAnalyticsClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing GA4 accounts", { returnAll, limit });

    return await client.adminAll(
      "/accounts",
      "accounts",
      { query: { showDeleted: p.showDeleted === true ? "true" : undefined } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
