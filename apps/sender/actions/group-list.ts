import type { ActionDefinition } from "@w6w/types";
import { SenderClient, type SenderListPage } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

/** `GET /v2/groups` — all groups in the account. */
interface Input {
  page?: number;
  limit?: number;
  order?: string;
  direction?: string;
}

const groupList: ActionDefinition<Input> = {
  key: "group-list",
  type: "search",
  resource: "group",
  title: "List Groups",
  description: "List all groups in the account.",
  params: paginationParams(),
  output: [
    { key: "data", type: "array", label: "Groups" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).json<SenderListPage<unknown>>("/groups", {
      query: paginationQuery(input),
    });
  },
};

export default groupList;
