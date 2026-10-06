import type { ActionDefinition } from "@w6w/types";
import { call, V2 } from "../lib/client.ts";
import { int, select } from "../lib/params.ts";

type Input = {
  page?: number;
  sort?: string;
};

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List the users of the account with their role.",
  params: [
    int("page", "Page", { hint: "0-based page number." }),
    select("sort", "Sort", ["+id", "-id"]),
  ],
  output: [
    { key: "users", type: "array", label: "Users: id, name, email, role" },
    { key: "count", type: "number", label: "Users on this page" },
    {
      key: "pagination",
      type: "object",
      label: "total_elements, total_pages, current_page_number, page_size",
    },
  ],

  async execute(input, ctx) {
    const body = await call(ctx, "GET", V2, "/users", {
      query: { page: input.page, sort: input.sort },
    }) as { content?: unknown[]; pagination_data?: unknown };
    const users = body.content ?? [];
    return { users, count: users.length, pagination: body.pagination_data ?? null };
  },
};

export default userList;
