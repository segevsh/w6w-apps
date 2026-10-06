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
  idsParam,
  LIST_OUTPUT,
  pageParam,
  pageSizeParam,
  siteParam,
} from "../lib/params.ts";

interface Input extends CommonInput {
  userIds: string | string[];
}

const userBadgeList: ActionDefinition<Input> = {
  key: "user-badge-list",
  type: "read",
  resource: "badge",
  title: "List Badges Of Users",
  description: "Badges earned by the given users.",
  params: [
    siteParam,
    idsParam(
      "userIds",
      "User IDs",
      "One or more user IDs, comma- or semicolon-separated (max 100).",
    ),
    pageParam,
    pageSizeParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/users/${idList(input.userIds)}/badges`, {
      ...commonQuery(input),
    });
    return wrapperResult(body);
  },
};

export default userBadgeList;
