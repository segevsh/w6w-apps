import type { ActionDefinition } from "@w6w/types";
import { pathId, RecurlyClient } from "../lib/client.ts";

interface Input {
  accountId: string;
}

/**
 * `GET /accounts/{account_id}` — fetch a single account.
 *
 * `accountId` accepts Recurly's own ID with no prefix, OR the account's
 * `code` prefixed with `code-` (e.g. `code-bob`) — see `lib/client.ts` module
 * doc §3. A bare code with no prefix looks up a (nonexistent) numeric-style
 * ID and 404s without explanation.
 */
const getAccount: ActionDefinition<Input> = {
  key: "get-account",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Fetch a single account by Recurly ID or by code (prefixed `code-`).",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint: "Recurly ID (`e28zov4fw0v2`) or account code prefixed `code-` (`code-bob`).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "code", type: "string", label: "Account code" },
    { key: "state", type: "string", label: "State (active / inactive)" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
  ],

  execute(input, ctx) {
    return RecurlyClient.fromConnection(ctx).request(`/accounts/${pathId(input.accountId)}`);
  },
};

export default getAccount;
