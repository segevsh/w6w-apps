import type { ActionDefinition } from "@w6w/types";
import { PlaidClient } from "../lib/client.ts";
import { ACCESS_TOKEN_PARAM } from "../lib/params.ts";

/**
 * `POST /item/get` — the health of one bank connection.
 *
 * The field that matters is **`error`**. An Item whose credentials have expired
 * carries `ITEM_LOGIN_REQUIRED` here, and will keep failing every data call
 * until somebody re-authenticates through Link in update mode. Reading this is
 * how a workflow tells "no new transactions" from "this connection has been
 * broken for a fortnight and nobody noticed".
 *
 * `consented_products` and `billed_products` are worth knowing apart: consented
 * is what the user agreed to, billed is what the integration is paying for.
 * `update_type` says whether the Item refreshes on a background schedule or
 * only on demand, which decides whether a sync will ever see anything new
 * without `transaction-refresh`.
 */
const action: ActionDefinition = {
  key: "item-get",
  type: "read",
  resource: "item",
  title: "Get Item",
  description:
    "One bank connection's state — including the error that says its credentials have expired, " +
    "which is otherwise indistinguishable from a quiet account.",
  params: [ACCESS_TOKEN_PARAM],
  output: [
    { key: "item", type: "object", label: "Item (including its error)" },
    { key: "status", type: "object", label: "Status" },
    { key: "request_id", type: "string", label: "Request ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const accessToken = String(p.accessToken ?? "").trim();
    if (!accessToken) throw new Error("`accessToken` is required");

    const body = await new PlaidClient(ctx).request<{ item?: { error?: { error_code?: string } } }>(
      "/item/get",
      { access_token: accessToken },
    );
    const code = body?.item?.error?.error_code;
    if (code) {
      ctx.log("warn", "this Plaid Item is in an error state", { error_code: code });
    }
    return body;
  },
};

export default action;
