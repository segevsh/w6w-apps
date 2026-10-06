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

const userReputationList: ActionDefinition<Input> = {
  key: "user-reputation-list",
  type: "read",
  resource: "user",
  title: "List Reputation Changes",
  description: "Recent reputation changes of the given users.",
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
    const body = await new StackExchangeClient(ctx).get(
      `/users/${idList(input.userIds)}/reputation`,
      {
        ...commonQuery(input),
      },
    );
    return wrapperResult(body);
  },
};

export default userReputationList;
