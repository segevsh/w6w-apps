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
  postIds: string | string[];
}

const postGet: ActionDefinition<Input> = {
  key: "post-get",
  type: "read",
  resource: "post",
  title: "Get Posts",
  description: "Fetch posts (questions or answers) by ID when you do not know which kind an ID is.",
  params: [
    siteParam,
    idsParam(
      "postIds",
      "Post IDs",
      "One or more question or answer IDs, comma- or semicolon-separated (max 100).",
    ),
    pageParam,
    pageSizeParam,
    sortParam(["activity", "creation", "votes"], "activity"),
    orderParam,
    minParam,
    maxParam,
    fromDateParam,
    toDateParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/posts/${idList(input.postIds)}`, {
      ...commonQuery(input),
    });
    return wrapperResult(body);
  },
};

export default postGet;
