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

const questionAnswerList: ActionDefinition<Input> = {
  key: "question-answer-list",
  type: "read",
  resource: "answer",
  title: "List Answers On Questions",
  description: "Get the answers to one or more questions.",
  params: [
    siteParam,
    idsParam(
      "questionIds",
      "Question IDs",
      "One or more question IDs, comma- or semicolon-separated (max 100).",
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
      `/questions/${idList(input.questionIds)}/answers`,
      {
        ...commonQuery(input),
      },
    );
    return wrapperResult(body);
  },
};

export default questionAnswerList;
