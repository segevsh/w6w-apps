import type { ActionDefinition } from "@w6w/types";
import { compact, DropboxSignClient } from "../lib/client.ts";

/**
 * `PUT /account` — verified against the official OpenAPI document
 * (`accountUpdate`).
 *
 * The field worth caring about is `callback_url`: the address Dropbox Sign
 * `POST`s every event to. Setting it here rewires **the whole account's**
 * events, not one request's — anything already listening at the old address
 * stops hearing about signatures, silently.
 */
const action: ActionDefinition = {
  key: "account-update",
  type: "perform",
  resource: "account",
  title: "Update the account",
  description: "Change the account's event callback URL or locale.",
  idempotent: true,
  params: [
    {
      key: "callbackUrl",
      label: "Callback URL",
      type: "string",
      default: "",
      hint: "ACCOUNT-WIDE. Every event POSTs here; the previous listener stops receiving them.",
    },
    {
      key: "locale",
      label: "Locale",
      type: "string",
      default: "",
      placeholder: "en-US",
    },
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      default: "",
      hint: "Update a team member's account instead of this connection's own.",
    },
  ],
  output: [
    { key: "account_id", type: "string", label: "Account ID" },
    { key: "callback_url", type: "string", label: "Event callback URL" },
    { key: "locale", type: "string", label: "Locale" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const body = compact({
      callback_url: p.callbackUrl,
      locale: p.locale,
      account_id: p.accountId,
    });
    // An account_id alone names a target without changing anything.
    const changes = Object.keys(body).filter((k) => k !== "account_id");
    if (changes.length === 0) {
      throw new Error("nothing to update — set a callback URL or a locale");
    }

    ctx.log("info", "updating the Dropbox Sign account", { changes });

    const res = await new DropboxSignClient(ctx).request<
      { account?: Record<string, unknown> }
    >("/account", { method: "PUT", body });
    return res?.account;
  },
};

export default action;
