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
  title: string;
  tagged?: string;
  nottagged?: string;
}

const similarQuestionList: ActionDefinition<Input> = {
  key: "similar-question-list",
  type: "read",
  resource: "question",
  title: "List Similar Questions",
  description:
    "Questions similar to a hypothetical one given a title (and optional tags), like the site's ask-page suggestions.",
  params: [
    siteParam,
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      hint: "The title to match against.",
    },
    {
      key: "tagged",
      label: "Tags",
      type: "string",
      hint: "Semicolon- or comma-separated tags.",
    },
    {
      key: "nottagged",
      label: "Excluded tags",
      type: "string",
      hint: "Semicolon- or comma-separated tags none of which may be present.",
    },
    pageParam,
    pageSizeParam,
    sortParam(["activity", "creation", "votes", "relevance"], "activity"),
    orderParam,
    minParam,
    maxParam,
    fromDateParam,
    toDateParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/similar`, {
      ...commonQuery(input),
      title: input.title,
      tagged: tagList(input.tagged),
      nottagged: tagList(input.nottagged),
    });
    return wrapperResult(body);
  },
};

export default similarQuestionList;
