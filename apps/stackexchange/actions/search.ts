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
  intitle?: string;
  tagged?: string;
  nottagged?: string;
}

const search: ActionDefinition<Input> = {
  key: "search",
  type: "read",
  resource: "question",
  title: "Search Questions",
  description:
    "Search a site's questions. At least one of Tags or Title contains is required; Tags match any (OR).",
  params: [
    siteParam,
    {
      key: "intitle",
      label: "Title contains",
      type: "string",
      hint: "Text that must appear in the title.",
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
    const body = await new StackExchangeClient(ctx).get(`/search`, {
      ...commonQuery(input),
      intitle: input.intitle,
      tagged: tagList(input.tagged),
      nottagged: tagList(input.nottagged),
    });
    return wrapperResult(body);
  },
};

export default search;
