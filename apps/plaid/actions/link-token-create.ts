import type { ActionDefinition } from "@w6w/types";
import { compact, csv, PlaidClient } from "../lib/client.ts";

/**
 * `POST /link/token/create` — the token a browser needs to start Plaid Link.
 *
 * ## What a workflow can and cannot do here
 *
 * Connecting a bank account **requires a human in a browser**: Plaid Link is
 * where somebody chooses their institution and types their credentials, and
 * nothing about that can be automated — by design, and correctly so.
 *
 * What a workflow *can* do is mint the short-lived token that front end needs.
 * So this action is the server half of an onboarding flow: create the link
 * token, hand it to the page, and the page returns a **public token** that
 * `public-token-exchange` turns into an Item.
 *
 * ## Update mode is how a broken Item gets fixed
 *
 * Passing an existing `access_token` puts Link into *update mode*, which
 * re-authenticates an Item rather than creating a new one. That is the fix for
 * `ITEM_LOGIN_REQUIRED` — the error a sync starts returning when a user changes
 * their bank password — and it preserves the Item, its id and its history,
 * where a fresh connection would not.
 *
 * The token expires in four hours, and is single-use.
 */
const action: ActionDefinition = {
  key: "link-token-create",
  type: "perform",
  resource: "item",
  title: "Create a Link token",
  description:
    "Mint the short-lived token Plaid Link needs in a browser. With an access token it opens in " +
    "update mode, which is how an expired Item is repaired without losing its history.",
  idempotent: false,
  params: [
    {
      key: "clientUserId",
      label: "Your User ID",
      type: "string",
      required: true,
      default: "",
      hint: "Your own stable id for this person — not an email or anything else that changes. " +
        "Plaid uses it to correlate their Items.",
    },
    {
      key: "clientName",
      label: "Application Name",
      type: "string",
      required: true,
      default: "",
      hint: "Shown to the user inside Link.",
    },
    {
      key: "products",
      label: "Products",
      type: "string",
      default: "transactions",
      hint: "Comma-separated: transactions, auth, identity, liabilities, investments. Asking for " +
        "more than you need narrows which institutions will work and what the user consents to.",
    },
    {
      key: "countryCodes",
      label: "Country Codes",
      type: "string",
      default: "US",
      hint: "Comma-separated ISO codes — US, CA, GB, and so on.",
    },
    {
      key: "language",
      label: "Language",
      type: "string",
      default: "en",
    },
    {
      key: "accessToken",
      label: "Access Token (update mode)",
      type: "secret",
      hint: "Supply an existing Item's token to REPAIR it rather than create a new one — the " +
        "fix for ITEM_LOGIN_REQUIRED.",
    },
    {
      key: "webhook",
      label: "Webhook URL",
      type: "string",
      default: "",
      advanced: true,
      hint: "Where Plaid posts Item events — including the one saying new transactions are ready.",
    },
    {
      key: "redirectUri",
      label: "Redirect URI",
      type: "string",
      default: "",
      advanced: true,
      hint: "Required for OAuth institutions, and must be registered in the Plaid dashboard.",
    },
  ],
  output: [
    { key: "link_token", type: "string", label: "Link token (hand to the browser)" },
    { key: "expiration", type: "string", label: "Expires at" },
    { key: "request_id", type: "string", label: "Request ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const clientUserId = String(p.clientUserId ?? "").trim();
    if (!clientUserId) throw new Error("`clientUserId` is required");
    const clientName = String(p.clientName ?? "").trim();
    if (!clientName) throw new Error("`clientName` is required");

    const accessToken = String(p.accessToken ?? "").trim();
    const products = csv(p.products);

    // In update mode Plaid derives the products from the existing Item, and
    // sending them is an error.
    if (accessToken && products) {
      ctx.log(
        "info",
        "update mode ignores `products` — Plaid takes them from the existing Item",
        {},
      );
    }

    return await new PlaidClient(ctx).request(
      "/link/token/create",
      compact({
        user: { client_user_id: clientUserId },
        client_name: clientName,
        products: accessToken ? undefined : products,
        country_codes: csv(p.countryCodes) ?? ["US"],
        language: String(p.language ?? "en"),
        access_token: accessToken || undefined,
        webhook: p.webhook,
        redirect_uri: p.redirectUri,
      }),
    );
  },
};

export default action;
