import type { ActionDefinition } from "@w6w/types";
import { LobClient } from "../lib/client.ts";
import {
  filterParams,
  listOutput,
  type MailListInput,
  mailListParams,
  mailListQuery,
  paginationParams,
} from "../lib/params.ts";

interface Input extends MailListInput {}

const checkList: ActionDefinition<Input> = {
  key: "check-list",
  type: "search",
  resource: "check",
  title: "List Checks",
  description:
    "List checks sent from this account, with status, mail type, send date and metadata filters and cursor paging.",
  params: [
    ...paginationParams(10),
    ...filterParams,
    ...mailListParams,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new LobClient(ctx).list("/checks", mailListQuery(input), {
      includeTotal: input.includeTotal,
    });
  },
};

export default checkList;
