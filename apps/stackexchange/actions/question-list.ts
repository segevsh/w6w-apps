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

const questionList: ActionDefinition<Input> = {
  key: "question-list",
  type: "read",
  resource: "question",
  title: "List Questions",
  description: "List the questions on a site. Filter with tags, date range and score bounds.",
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
    sortParam(["activity", "creation", "votes", "hot", "week", "month"], "activity"),
    orderParam,
    minParam,
    maxParam,
    fromDateParam,
    toDateParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/questions`, {
      ...commonQuery(input),
      tagged: tagList(input.tagged),
    });
    return wrapperResult(body);
  },
};

export default questionList;
