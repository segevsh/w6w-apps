import type { ActionDefinition } from "@w6w/types";
import { compact, HeyReachClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

interface Input {
  keyword?: string;
  limit?: number;
  offset?: number;
}

/**
 * `POST /api/public/li_account/GetAll` — the workspace's sender accounts.
 *
 * Every sender account a workflow can put on a campaign comes from here, along
 * with the two fields that decide whether it can actually send: `isActive`
 * (the account is switched on in HeyReach) and `authIsValid` (its LinkedIn
 * session is still signed in). A campaign added to an account whose auth lapsed
 * simply does not run.
 *
 * ## Paging is a POST body
 *
 * `{ offset, limit, keyword }` — `offset` and `limit` are sent explicitly
 * because the body is the only place the API can read them from. The document
 * caps the page at 100 accounts.
 *
 * The document's schema types every scalar of this response as `string`,
 * `isActive` and `authIsValid` included — a generator artifact, so only the
 * unambiguous fields are declared as output here.
 */
const action: ActionDefinition<Input> = {
  key: "linkedin-account-list",
  type: "search",
  resource: "linkedin-account",
  title: "List LinkedIn Accounts",
  description:
    "List the workspace's sender LinkedIn accounts, with their active flag and auth validity " +
    "(POST /api/public/li_account/GetAll).",
  params: [
    {
      key: "keyword",
      label: "Search",
      type: "string",
      hint: "Free-text filter on the account's own details.",
    },
    ...paginationParams(100, "Accounts per page. The API returns at most 100."),
  ],
  output: [
    { key: "totalCount", type: "number", label: "Matching accounts" },
    { key: "items", type: "array", label: "Sender accounts" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/li_account/GetAll", {
      method: "POST",
      body: compact({
        offset: input.offset,
        limit: input.limit,
        keyword: input.keyword,
      }),
    });
  },
};

export default action;
