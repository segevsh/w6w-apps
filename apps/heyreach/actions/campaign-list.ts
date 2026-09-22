import type { ActionDefinition } from "@w6w/types";
import { compact, HeyReachClient, numberList, stringList } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

interface Input {
  keyword?: string;
  statuses?: string[] | string;
  accountIds?: number[] | string;
  limit?: number;
  offset?: number;
}

/**
 * `POST /api/public/campaign/GetAll` — the workspace's campaigns.
 *
 * The campaign object is where the outreach state lives: `status` (the
 * campaign's own lifecycle state), `progressStats` (how many leads are
 * finished, in progress, pending, failed), `campaignAccountIds` (which senders
 * work it), `linkedInUserListId` (the list it draws from) and the
 * `exclude*` booleans that decide which leads are skipped.
 *
 * ## Filters
 *
 * `keyword` matches on the campaign name. `statuses` filters by campaign state
 * and `accountIds` by the sender accounts attached — but the document
 * enumerates *neither* set of values, so `statuses` is a free-form list of
 * strings rather than an invented option list; read the `status` field of any
 * campaign this action returns to learn the vocabulary this account uses.
 */
const action: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "search",
  resource: "campaign",
  title: "List Campaigns",
  description:
    "List campaigns with their status, progress and sender accounts, filtered by keyword, " +
    "status or account (POST /api/public/campaign/GetAll).",
  params: [
    { key: "keyword", label: "Search", type: "string", hint: "Free-text match on the name." },
    {
      key: "statuses",
      label: "Campaign statuses",
      type: "array",
      item: { type: "string", placeholder: "IN_PROGRESS" },
      hint: "Only campaigns in these statuses. The document does not list the values it accepts, " +
        "so read a campaign's `status` field for the vocabulary.",
    },
    {
      key: "accountIds",
      label: "Sender accounts",
      type: "array",
      item: { type: "number" },
      hint: "Only campaigns that use these LinkedIn accounts.",
    },
    ...paginationParams(100, "Campaigns per page. The API returns at most 100."),
  ],
  output: [
    { key: "totalCount", type: "number", label: "Matching campaigns" },
    { key: "items", type: "array", label: "Campaigns" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/campaign/GetAll", {
      method: "POST",
      body: compact({
        offset: input.offset,
        limit: input.limit,
        keyword: input.keyword,
        statuses: stringList(input.statuses),
        accountIds: numberList(input.accountIds, "Sender accounts"),
      }),
    });
  },
};

export default action;
