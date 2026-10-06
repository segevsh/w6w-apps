import type { ActionDefinition } from "@w6w/types";
import { LobClient } from "../lib/client.ts";
import {
  filterParams,
  listOutput,
  type PageInput,
  pageQuery,
  paginationParams,
} from "../lib/params.ts";

interface Input extends PageInput {}

const addressList: ActionDefinition<Input> = {
  key: "address-list",
  type: "search",
  resource: "address",
  title: "List Addresses",
  description: "List the saved addresses in the address book, newest first, with cursor paging.",
  params: [...paginationParams(10), ...filterParams],
  output: listOutput,

  execute(input, ctx) {
    return new LobClient(ctx).list("/addresses", pageQuery(input), {
      includeTotal: input.includeTotal,
    });
  },
};

export default addressList;
