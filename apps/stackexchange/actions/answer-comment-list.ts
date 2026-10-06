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
  answerIds: string | string[];
}

const answerCommentList: ActionDefinition<Input> = {
  key: "answer-comment-list",
  type: "read",
  resource: "comment",
  title: "List Comments On Answers",
  description: "Get the comments on one or more answers.",
  params: [
    siteParam,
    idsParam(
      "answerIds",
      "Answer IDs",
      "One or more answer IDs, comma- or semicolon-separated (max 100).",
    ),
    pageParam,
    pageSizeParam,
    sortParam(["creation", "votes"], "creation"),
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
      `/answers/${idList(input.answerIds)}/comments`,
      {
        ...commonQuery(input),
      },
    );
    return wrapperResult(body);
  },
};

export default answerCommentList;
