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
  questionIds: string | string[];
}

const questionCommentList: ActionDefinition<Input> = {
  key: "question-comment-list",
  type: "read",
  resource: "comment",
  title: "List Comments On Questions",
  description: "Get the comments on one or more questions (not their answers' comments).",
  params: [
    siteParam,
    idsParam(
      "questionIds",
      "Question IDs",
      "One or more question IDs, comma- or semicolon-separated (max 100).",
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
      `/questions/${idList(input.questionIds)}/comments`,
      {
        ...commonQuery(input),
      },
    );
    return wrapperResult(body);
  },
};

export default questionCommentList;
