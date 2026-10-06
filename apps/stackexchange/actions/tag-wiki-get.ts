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

const tagWikiGet: ActionDefinition<Input> = {
  key: "tag-wiki-get",
  type: "read",
  resource: "tag",
  title: "Get Tag Wikis",
  description: "The wiki excerpt and body of the named tags.",
  params: [
    siteParam,
    idsParam("tags", "Tags", "One or more tag names, comma- or semicolon-separated."),
    pageParam,
    pageSizeParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/tags/${idList(input.tags)}/wikis`, {
      ...commonQuery(input),
    });
    return wrapperResult(body);
  },
};

export default tagWikiGet;
