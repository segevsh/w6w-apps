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

const tagFaqList: ActionDefinition<Input> = {
  key: "tag-faq-list",
  type: "read",
  resource: "question",
  title: "List Tag FAQ Questions",
  description: "The frequently-asked questions of the named tags.",
  params: [
    siteParam,
    idsParam("tags", "Tags", "One or more tag names, comma- or semicolon-separated."),
    pageParam,
    pageSizeParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/tags/${idList(input.tags)}/faq`, {
      ...commonQuery(input),
    });
    return wrapperResult(body);
  },
};

export default tagFaqList;
