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
  tags: string | string[];
}

const tagGet: ActionDefinition<Input> = {
  key: "tag-get",
  type: "read",
  resource: "tag",
  title: "Get Tags",
  description: "Fetch tag objects (question count, synonyms flag) for the named tags.",
  params: [
    siteParam,
    idsParam("tags", "Tags", "One or more tag names, comma- or semicolon-separated."),
    pageParam,
    pageSizeParam,
    sortParam(["popular", "activity", "name"], "popular"),
    orderParam,
    minParam,
    maxParam,
    fromDateParam,
    toDateParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/tags/${idList(input.tags)}/info`, {
      ...commonQuery(input),
    });
    return wrapperResult(body);
  },
};

export default tagGet;
