import type { ActionDefinition } from "@w6w/types";
import {
  type CommonInput,
  commonQuery,
  idList,
  seg,
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
  tag: string | string[];
  period: string;
}

const tagTopAnswererList: ActionDefinition<Input> = {
  key: "tag-top-answerer-list",
  type: "read",
  resource: "user",
  title: "List Top Answerers For A Tag",
  description: "The top 20 answerers in one tag.",
  params: [
    siteParam,
    idsParam("tag", "Tag", "A single tag name."),
    {
      key: "period",
      label: "Period",
      type: "select",
      required: true,
      options: [{ value: "all_time", label: "All time" }, {
        value: "month",
        label: "Last 30 days",
      }],
      hint: "`all_time` or `month`.",
    },
    pageParam,
    pageSizeParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(
      `/tags/${idList(input.tag)}/top-answerers/${seg(input.period)}`,
      {
        ...commonQuery(input),
      },
    );
    return wrapperResult(body);
  },
};

export default tagTopAnswererList;
