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

const commentList: ActionDefinition<Input> = {
  key: "comment-list",
  type: "read",
  resource: "comment",
  title: "List Comments",
  description: "List all comments on a site.",
  params: [
    siteParam,
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
    const body = await new StackExchangeClient(ctx).get(`/comments`, {
      ...commonQuery(input),
    });
    return wrapperResult(body);
  },
};

export default commentList;
