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

const badgeList: ActionDefinition<Input> = {
  key: "badge-list",
  type: "read",
  resource: "badge",
  title: "List Badges",
  description: "All badges on a site.",
  params: [
    siteParam,
    pageParam,
    pageSizeParam,
    sortParam(["rank", "type"], "rank"),
    orderParam,
    minParam,
    maxParam,
    fromDateParam,
    toDateParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/badges`, {
      ...commonQuery(input),
    });
    return wrapperResult(body);
  },
};

export default badgeList;
