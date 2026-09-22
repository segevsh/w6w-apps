import type { ActionDefinition } from "@w6w/types";
import { compact, HeyReachClient, numberList } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

interface Input {
  keyword?: string;
  listType?: string;
  campaignIds?: number[] | string;
  limit?: number;
  offset?: number;
}

/**
 * `POST /api/public/list/GetAll` — the workspace's lead and company lists.
 *
 * Lists are what campaigns draw leads from (`Create` takes a
 * `linkedInUserListId`), so this is the lookup a workflow runs before creating
 * a campaign or pushing leads into one.
 *
 * ## The body, and its two shapes
 *
 * `{ offset, limit, keyword, listType, campaignIds }`, all in the POST body.
 * `campaignIds` is the filter that matters most: "which lists does this
 * campaign draw from" is not answerable from the campaign object alone, only by
 * listing the lists and matching on `campaignIds`.
 *
 * The document's own prose names exactly two list types — `USER_LIST` and
 * `COMPANY_LIST` — which is what the type filter offers.
 */
const action: ActionDefinition<Input> = {
  key: "list-get-all",
  type: "search",
  resource: "list",
  title: "List Lists",
  description:
    "List lead and company lists, filtered by keyword, type or the campaigns that use them " +
    "(POST /api/public/list/GetAll).",
  params: [
    { key: "keyword", label: "Search", type: "string", hint: "Free-text filter on the list name." },
    {
      key: "listType",
      label: "List type",
      type: "select",
      options: [
        { value: "USER_LIST", label: "Lead list" },
        { value: "COMPANY_LIST", label: "Company list" },
      ],
      hint: "Leave empty to return both kinds.",
    },
    {
      key: "campaignIds",
      label: "Used by campaigns",
      type: "array",
      item: { type: "number" },
      hint: "Only lists attached to these campaign ids.",
    },
    ...paginationParams(100, "Lists per page. The API returns at most 100."),
  ],
  output: [
    { key: "totalCount", type: "number", label: "Matching lists" },
    { key: "items", type: "array", label: "Lists" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/list/GetAll", {
      method: "POST",
      body: compact({
        offset: input.offset,
        limit: input.limit,
        keyword: input.keyword,
        listType: input.listType,
        campaignIds: numberList(input.campaignIds, "Used by campaigns"),
      }),
    });
  },
};

export default action;
