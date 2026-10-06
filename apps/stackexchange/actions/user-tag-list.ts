import type { ActionDefinition } from "@w6w/types";
import {
  type CommonInput,
  commonQuery,
  idList,
  StackExchangeClient,
  wrapperResult,
} from "../lib/client.ts";
import {
  filterParam,
  fromDateParam,
  idsParam,
  LIST_OUTPUT,
  maxParam,
  minParam,
  orderParam,
  pageParam,
  pageSizeParam,
  siteParam,
  sortParam,
  toDateParam,
} from "../lib/params.ts";

interface Input extends CommonInput {
  userIds: string | string[];
}

const userTagList: ActionDefinition<Input> = {
  key: "user-tag-list",
  type: "read",
  resource: "tag",
  title: "List Tags Of Users",
  description: "Tags the given users have been active in.",
  params: [
    siteParam,
    idsParam(
      "userIds",
      "User IDs",
      "One or more user IDs, comma- or semicolon-separated (max 100).",
    ),
    pageParam,
    pageSizeParam,
    sortParam(["popular", "activity", "name"], "popular"),
    orderParam,
    minParam,
    maxParam,
    fromDateParam,
    toDateParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/users/${idList(input.userIds)}/tags`, {
      ...commonQuery(input),
    });
    return wrapperResult(body);
  },
};

export default userTagList;
