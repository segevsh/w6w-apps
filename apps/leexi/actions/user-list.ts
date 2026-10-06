import type { ActionDefinition } from "@w6w/types";
import { LeexiClient } from "../lib/client.ts";

interface Input {
  page?: number;
  items?: number;
}

/** `GET /users` */
const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List the users of your workspace, one page at a time.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "First page is 1.",
      validation: { min: 1, integer: true },
    },
    {
      key: "items",
      label: "Items per page",
      type: "number",
      hint: "1-100, defaults to 10.",
      validation: { min: 1, max: 100, integer: true },
    },
  ],
  output: [
    { key: "data", type: "array", label: "The records on this page" },
    {
      key: "pagination",
      type: "object",
      label: "{ page, items, count, pages } — stop when page reaches pages",
    },
  ],

  async execute(input, ctx) {
    const res = await new LeexiClient(ctx).request("GET", "/users", {
      query: { page: input.page, items: input.items },
    });
    return { data: res.data ?? [], pagination: res.pagination ?? null };
  },
};

export default userList;
