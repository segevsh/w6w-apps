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
  inname?: string;
}

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "List Tags",
  description: "List the tags on a site, optionally filtered by name substring.",
  params: [
    siteParam,
    {
      key: "inname",
      label: "Name contains",
      type: "string",
      hint: "Substring of the tag name.",
    },
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
    const body = await new StackExchangeClient(ctx).get(`/tags`, {
      ...commonQuery(input),
      inname: input.inname,
    });
    return wrapperResult(body);
  },
};

export default tagList;
