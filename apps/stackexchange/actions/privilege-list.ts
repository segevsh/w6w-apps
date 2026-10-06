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

const privilegeList: ActionDefinition<Input> = {
  key: "privilege-list",
  type: "read",
  resource: "privilege",
  title: "List Privileges",
  description: "The reputation privileges of a site.",
  params: [
    siteParam,
    pageParam,
    pageSizeParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/privileges`, {
      ...commonQuery(input),
    });
    return wrapperResult(body);
  },
};

export default privilegeList;
