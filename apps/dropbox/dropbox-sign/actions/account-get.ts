import type { ActionDefinition } from "@w6w/types";
import { compact, DropboxSignClient } from "../lib/client.ts";

/**
 * `GET /account` — verified against the official OpenAPI document
 * (`accountGet`).
 *
 * The one call that answers three questions at once: who this credential is,
 * what plan it is on (`is_paid_hs` — a free account can only ever create
 * test-mode requests), and how much quota is left (`quotas`). The `quota`
 * health check reads the same endpoint.
 */
const action: ActionDefinition = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get the account",
  description: "Retrieve the connected account, its plan and its remaining quota.",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      default: "",
      hint: "Look up a team member instead of this connection's own account.",
    },
    {
      key: "emailAddress",
      label: "Email Address",
      type: "string",
      default: "",
      hint: "Look one up by email instead of by id.",
    },
  ],
  output: [
    { key: "account_id", type: "string", label: "Account ID" },
    { key: "email_address", type: "string", label: "Email address" },
    { key: "is_paid_hs", type: "boolean", label: "Paid plan — a free plan is test-mode only" },
    { key: "is_locked", type: "boolean", label: "Locked out by a team admin" },
    { key: "quotas", type: "object", label: "Remaining quota (null means no ceiling)" },
    { key: "callback_url", type: "string", label: "Event callback URL" },
    { key: "team_id", type: "string", label: "Team ID" },
    { key: "role_code", type: "string", label: "Team role" },
    { key: "locale", type: "string", label: "Locale" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    ctx.log("info", "getting the Dropbox Sign account", {});

    const res = await new DropboxSignClient(ctx).request<
      { account?: Record<string, unknown> }
    >("/account", {
      query: compact({
        account_id: p.accountId,
        email_address: p.emailAddress,
      }) as Record<string, string>,
    });
    return res?.account;
  },
};

export default action;
