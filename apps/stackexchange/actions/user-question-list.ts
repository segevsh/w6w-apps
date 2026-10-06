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

const userQuestionList: ActionDefinition<Input> = {
  key: "user-question-list",
  type: "read",
  resource: "question",
  title: "List Questions By Users",
  description: "Questions asked by the given users.",
  params: [
    siteParam,
    idsParam(
      "userIds",
      "User IDs",
      "One or more user IDs, comma- or semicolon-separated (max 100).",
    ),
    pageParam,
    pageSizeParam,
    sortParam(["activity", "creation", "votes"], "activity"),
    orderParam,
    minParam,
    maxParam,
    fromDateParam,
    toDateParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(
      `/users/${idList(input.userIds)}/questions`,
      {
        ...commonQuery(input),
      },
    );
    return wrapperResult(body);
  },
};

export default userQuestionList;
