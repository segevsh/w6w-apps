import type { ActionDefinition } from "@w6w/types";
import { PlaidClient } from "../lib/client.ts";

/**
 * `POST /item/public_token/exchange` — turn what the browser returned into an
 * Item.
 *
 * The second half of onboarding. Plaid Link hands the front end a **public
 * token**, which is short-lived (thirty minutes) and useless on its own; this
 * exchanges it for the `access_token` that every other action takes.
 *
 * ## The response is the most sensitive thing this app produces
 *
 * That access token is a long-lived credential for one person's bank data.
 * Anyone holding it can read their balances and transactions until the Item is
 * removed, and it does not expire on its own. It should be stored the way a
 * password is stored — encrypted, never logged, never in a workflow variable
 * that gets printed.
 *
 * This action never logs the token, and the output field says what it is.
 */
const action: ActionDefinition = {
  key: "public-token-exchange",
  type: "perform",
  resource: "item",
  title: "Exchange a public token",
  description:
    "Turn the browser's short-lived public token into an Item's access token. That token is a " +
    "long-lived credential for somebody's bank data — store it like a password.",
  idempotent: false,
  params: [
    {
      key: "publicToken",
      label: "Public Token",
      type: "secret",
      required: true,
      hint: "From Plaid Link's onSuccess callback. Valid for about thirty minutes.",
    },
  ],
  output: [
    { key: "access_token", type: "string", label: "Access token — a long-lived secret" },
    { key: "item_id", type: "string", label: "Item ID" },
    { key: "request_id", type: "string", label: "Request ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const publicToken = String(p.publicToken ?? "").trim();
    if (!publicToken) throw new Error("`publicToken` is required");

    // Deliberately logs nothing about the response.
    ctx.log("info", "exchanging a Plaid public token", {});
    return await new PlaidClient(ctx).request("/item/public_token/exchange", {
      public_token: publicToken,
    });
  },
};

export default action;
