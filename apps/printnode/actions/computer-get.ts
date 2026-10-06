import type { ActionDefinition } from "@w6w/types";
import { PrintNodeClient, toSet } from "../lib/client.ts";
import { type Pagination, paginationParams, paginationQuery } from "../lib/params.ts";

/** `GET /computers/{COMPUTER SET}` — one or several computers by id. */
interface Input extends Pagination {
  computerIds: string | number;
}

const computerGet: ActionDefinition<Input> = {
  key: "computer-get",
  type: "read",
  resource: "computer",
  title: "Get Computers",
  description: "Fetch one or more computers by id. Always returns a list, even for one id.",
  params: [
    {
      key: "computerIds",
      label: "Computer ID(s)",
      type: "string",
      required: true,
      hint: "A positive integer, or a comma-separated set such as `1,3,5`.",
    },
    ...paginationParams,
  ],
  output: [
    { key: "items", type: "array", label: "Computers" },
    { key: "count", type: "number", label: "Returned" },
    { key: "total", type: "number", label: "Total (Records-Total header)" },
  ],
  execute(input, ctx) {
    const set = toSet(input.computerIds, "Computer ID(s)");
    return new PrintNodeClient(ctx).list(`/computers/${set}`, paginationQuery(input));
  },
};

export default computerGet;
