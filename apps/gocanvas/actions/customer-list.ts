import type { ActionDefinition } from "@w6w/types";
import { GoCanvasClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

interface Input {
  page?: number;
}

const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "read",
  resource: "customer",
  title: "List Customers",
  description: "List the company's customers (Project Management View only).",
  params: [
    pageParam,
  ],
  output: [
    { key: "items", type: "array", label: "Customers on this page" },
    {
      key: "pagination",
      type: "object",
      label: "Paging headers; nextPage is null on the last page",
    },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).list("/customers", { page: input.page });
  },
};

export default customerList;
