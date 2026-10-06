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
  inname?: string;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List the users on a site, optionally filtered by display-name substring.",
  params: [
    siteParam,
    {
      key: "inname",
      label: "Name contains",
      type: "string",
      hint: "Substring of the display name.",
    },
    pageParam,
    pageSizeParam,
    sortParam(["reputation", "creation", "name", "modified"], "reputation"),
    orderParam,
    minParam,
    maxParam,
    fromDateParam,
    toDateParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/users`, {
      ...commonQuery(input),
      inname: input.inname,
    });
    return wrapperResult(body);
  },
};

export default userList;
