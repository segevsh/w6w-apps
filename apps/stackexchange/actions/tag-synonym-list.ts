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

const tagSynonymList: ActionDefinition<Input> = {
  key: "tag-synonym-list",
  type: "read",
  resource: "tag",
  title: "List Tag Synonyms",
  description: "Tag synonyms defined on a site.",
  params: [
    siteParam,
    pageParam,
    pageSizeParam,
    sortParam(["creation", "applied", "activity"], "creation"),
    orderParam,
    minParam,
    maxParam,
    fromDateParam,
    toDateParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/tags/synonyms`, {
      ...commonQuery(input),
    });
    return wrapperResult(body);
  },
};

export default tagSynonymList;
