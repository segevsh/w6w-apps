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

const answerGet: ActionDefinition<Input> = {
  key: "answer-get",
  type: "read",
  resource: "answer",
  title: "Get Answers",
  description: "Fetch answers by ID (up to 100 at once). Pass Filter `withbody` for the body text.",
  params: [
    siteParam,
    idsParam(
      "answerIds",
      "Answer IDs",
      "One or more answer IDs, comma- or semicolon-separated (max 100).",
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
    const body = await new StackExchangeClient(ctx).get(`/answers/${idList(input.answerIds)}`, {
      ...commonQuery(input),
    });
    return wrapperResult(body);
  },
};

export default answerGet;
