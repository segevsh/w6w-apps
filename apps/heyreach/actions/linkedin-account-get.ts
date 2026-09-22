import type { ActionDefinition } from "@w6w/types";
import { HeyReachClient } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

interface Input {
  accountId: number;
}

/**
 * `GET /api/public/li_account/GetById?accountId=…` — one sender account.
 *
 * The `accountId` is a **query parameter** here (unlike the list endpoints,
 * whose paging and filters ride in a POST body). The response carries the
 * account's per-action limits in `accountLimits` — daily message, InMail,
 * connection-request, profile-view, follow, post-like and connection-request
 * ceilings, each as a `current`/`max` pair (`messageLimit` /
 * `messageLimitMax`).
 *
 * The document's schema types every scalar of this response as `string`,
 * `isActive` and `authIsValid` included — a generator artifact — so only the
 * unambiguous fields are declared as output here; the full object is returned
 * either way.
 */
const action: ActionDefinition<Input> = {
  key: "linkedin-account-get",
  type: "read",
  resource: "linkedin-account",
  title: "Get LinkedIn Account",
  description: "Fetch one sender LinkedIn account by id, including its per-action limits " +
    "(GET /api/public/li_account/GetById).",
  params: [accountIdParam],
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "emailAddress", type: "string", label: "LinkedIn email address" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "profileUrl", type: "string", label: "LinkedIn profile URL" },
    { key: "accountLimits", type: "object", label: "Per-action sending limits" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/li_account/GetById", {
      query: { accountId: input.accountId },
    });
  },
};

export default action;
