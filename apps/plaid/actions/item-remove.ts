import type { ActionDefinition } from "@w6w/types";
import { PlaidClient } from "../lib/client.ts";
import { ACCESS_TOKEN_PARAM } from "../lib/params.ts";

/**
 * `POST /item/remove` — disconnect a bank account for good.
 *
 * This is the action a workflow owes its users. Removing an Item invalidates
 * its access token immediately, stops all billing for it, and ends Plaid's
 * access to that person's bank — which is what "delete my account" should mean
 * for anyone who connected one.
 *
 * It is irreversible in the way that matters: the access token is dead, and
 * reconnecting means the user going through Plaid Link again and producing a
 * **new Item with a new id**. Anything storing the old id will not follow.
 *
 * Removing an Item that is already gone is not an error, so this is safe to
 * retry — but it still requires an explicit confirmation, because the cost of
 * doing it to the wrong Item is a user having to reconnect their bank.
 */
const action: ActionDefinition = {
  key: "item-remove",
  type: "perform",
  resource: "item",
  title: "Remove Item",
  description:
    "Disconnect a bank account permanently — invalidating its token, ending billing, and ending " +
    "Plaid's access. Reconnecting produces a NEW Item with a new id.",
  idempotent: true,
  params: [
    ACCESS_TOKEN_PARAM,
    {
      key: "confirm",
      label: "Yes, disconnect this bank account",
      type: "boolean",
      required: true,
      default: false,
      hint: "The token dies immediately. The user would have to go through Plaid Link again, " +
        "and the resulting Item has a different id.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Removed" },
    { key: "request_id", type: "string", label: "Request ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const accessToken = String(p.accessToken ?? "").trim();
    if (!accessToken) throw new Error("`accessToken` is required");
    if (p.confirm !== true) {
      throw new Error(
        "refusing to remove this Item without `confirm` — the access token dies immediately and " +
          "the user would have to reconnect their bank through Plaid Link",
      );
    }

    ctx.log("warn", "removing a Plaid Item", {});
    const body = await new PlaidClient(ctx).request<{ request_id?: string }>("/item/remove", {
      access_token: accessToken,
    });
    return { ok: true, ...body };
  },
};

export default action;
