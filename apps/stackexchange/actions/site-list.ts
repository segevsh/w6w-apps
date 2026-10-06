import type { ActionDefinition } from "@w6w/types";
import {
  type CommonInput,
  commonQuery,
  StackExchangeClient,
  wrapperResult,
} from "../lib/client.ts";
import { filterParam, LIST_OUTPUT, pageParam, pageSizeParam } from "../lib/params.ts";

interface Input extends CommonInput {
}

const siteList: ActionDefinition<Input> = {
  key: "site-list",
  type: "read",
  resource: "site",
  title: "List Sites",
  description:
    "Every site on the Stack Exchange network, with its `api_site_parameter`. Changes rarely; cache it for a day.",
  params: [
    pageParam,
    pageSizeParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/sites`, {
      ...commonQuery(input, false),
    });
    return wrapperResult(body);
  },
};

export default siteList;
