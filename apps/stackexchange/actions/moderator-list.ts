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

const moderatorList: ActionDefinition<Input> = {
  key: "moderator-list",
  type: "read",
  resource: "user",
  title: "List Moderators",
  description: "Moderators of a site.",
  params: [
    siteParam,
    pageParam,
    pageSizeParam,
    sortParam(["reputation", "creation", "name", "modified"], "reputation"),
    orderParam,
    minParam,
    maxParam,
    fromDateParam,
    toDateParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/users/moderators`, {
      ...commonQuery(input),
    });
    return wrapperResult(body);
  },
};

export default moderatorList;
