import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId, type PageMeta } from "../lib/client.ts";
import { accountIdParam, paginationParams } from "../lib/params.ts";

/** `GET /v3/a/{account_id}/users.json` — Listing All Users. */
interface Input {
  accountId: string;
  companyId?: string;
  search?: string;
  sort?: "email" | "created_at";
  order?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List users within a CallRail account.",
  params: [
    accountIdParam,
    {
      key: "companyId",
      label: "Company",
      type: "string",
      hint: "Limit to users belonging to a single company.",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches first_name, last_name or email.",
    },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: [
        { value: "email", label: "Email" },
        { value: "created_at", label: "Created at" },
      ],
    },
    {
      key: "order",
      label: "Sort order",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    ...paginationParams(),
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Records per page" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalRecords", type: "number", label: "Total matching users" },
  ],

  async execute(input, ctx) {
    const body = await new CallRailClient(ctx).json<PageMeta & { users: unknown[] }>(
      `/a/${encodeId(input.accountId)}/users.json`,
      {
        query: {
          company_id: input.companyId,
          search: input.search,
          sort: input.sort,
          order: input.order,
          page: input.page,
          per_page: input.perPage,
        },
      },
    );
    return {
      users: body.users,
      page: body.page,
      perPage: body.per_page,
      totalPages: body.total_pages,
      totalRecords: body.total_records,
    };
  },
};

export default userList;
