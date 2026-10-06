import type { ActionDefinition } from "@w6w/types";
import {
  type CommonInput,
  commonQuery,
  StackExchangeClient,
  tagList,
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
  tagged?: string;
}

const questionUnansweredList: ActionDefinition<Input> = {
  key: "question-unanswered-list",
  type: "read",
  resource: "question",
  title: "List Unanswered Questions",
  description: "Questions the site considers unanswered.",
  params: [
    siteParam,
    {
      key: "tagged",
      label: "Tags",
      type: "string",
      hint: "Semicolon- or comma-separated tags.",
    },
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
    const body = await new StackExchangeClient(ctx).get(`/questions/unanswered`, {
      ...commonQuery(input),
      tagged: tagList(input.tagged),
    });
    return wrapperResult(body);
  },
};

export default questionUnansweredList;
