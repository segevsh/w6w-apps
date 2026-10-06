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

const templateList: ActionDefinition<Input> = {
  key: "template-list",
  type: "search",
  resource: "template",
  title: "List Templates",
  description: "List saved HTML templates with cursor paging.",
  params: [...paginationParams(10), ...filterParams],
  output: listOutput,

  execute(input, ctx) {
    return new LobClient(ctx).list("/templates", pageQuery(input), {
      includeTotal: input.includeTotal,
    });
  },
};

export default templateList;
