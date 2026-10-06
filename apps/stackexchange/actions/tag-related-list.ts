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
  idsParam,
  LIST_OUTPUT,
  pageParam,
  pageSizeParam,
  siteParam,
} from "../lib/params.ts";

interface Input extends CommonInput {
  tags: string | string[];
}

const tagRelatedList: ActionDefinition<Input> = {
  key: "tag-related-list",
  type: "read",
  resource: "tag",
  title: "List Related Tags",
  description: "Tags that commonly appear alongside the named tags.",
  params: [
    siteParam,
    idsParam("tags", "Tags", "One or more tag names, comma- or semicolon-separated."),
    pageParam,
    pageSizeParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/tags/${idList(input.tags)}/related`, {
      ...commonQuery(input),
    });
    return wrapperResult(body);
  },
};

export default tagRelatedList;
