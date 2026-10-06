import type { ActionDefinition } from "@w6w/types";
import {
  type CommonInput,
  commonQuery,
  StackExchangeClient,
  wrapperResult,
} from "../lib/client.ts";
import {
  filterParam,
  fromDateParam,
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
}

const answerList: ActionDefinition<Input> = {
  key: "answer-list",
  type: "read",
  resource: "answer",
  title: "List Answers",
  description: "List the answers on a site.",
  params: [
    siteParam,
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
    const body = await new StackExchangeClient(ctx).get(`/answers`, {
      ...commonQuery(input),
    });
    return wrapperResult(body);
  },
};

export default answerList;
