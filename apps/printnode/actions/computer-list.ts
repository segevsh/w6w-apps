import type { ActionDefinition } from "@w6w/types";
import { PrintNodeClient } from "../lib/client.ts";
import { type Pagination, paginationParams, paginationQuery } from "../lib/params.ts";

/** `GET /computers` — computers that have the PrintNode Client installed and have connected. */
const computerList: ActionDefinition<Pagination> = {
  key: "computer-list",
  type: "read",
  resource: "computer",
  title: "List Computers",
  description: "List the computers running the PrintNode Client on this account.",
  params: paginationParams,
  output: [
    { key: "items", type: "array", label: "Computers" },
    { key: "count", type: "number", label: "Returned" },
    { key: "total", type: "number", label: "Total (Records-Total header)" },
  ],
  execute(input, ctx) {
    return new PrintNodeClient(ctx).list("/computers", paginationQuery(input));
  },
};

export default computerList;
