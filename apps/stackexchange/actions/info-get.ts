import type { ActionDefinition } from "@w6w/types";
import {
  type CommonInput,
  commonQuery,
  StackExchangeClient,
  wrapperResult,
} from "../lib/client.ts";
import { filterParam, LIST_OUTPUT, pageParam, pageSizeParam, siteParam } from "../lib/params.ts";

interface Input extends CommonInput {
}

const infoGet: ActionDefinition<Input> = {
  key: "info-get",
  type: "read",
  resource: "site",
  title: "Get Site Info",
  description:
    "Network-statistics snapshot of a site: total questions, answers, users, unanswered, activity rates.",
  params: [
    siteParam,
    pageParam,
    pageSizeParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/info`, {
      ...commonQuery(input),
    });
    return wrapperResult(body);
  },
};

export default infoGet;
