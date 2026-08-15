import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId, type PageMeta } from "../lib/client.ts";
import { accountIdParam, companyIdParam, paginationParams, sortParams } from "../lib/params.ts";

/** `GET /v3/a/{account_id}/tags.json` — Retrieving All Tags. */
interface Input {
  accountId: string;
  companyId?: string;
  status?: "enabled" | "disabled";
  tagLevel?: "company" | "account";
  sort?: "name";
  order?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description: "List tags configured within a CallRail account.",
  params: [
    accountIdParam,
    companyIdParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "enabled", label: "Enabled" },
        { value: "disabled", label: "Disabled" },
      ],
    },
    {
      key: "tagLevel",
      label: "Tag level",
      type: "select",
      options: [
        { value: "company", label: "Company" },
        { value: "account", label: "Account" },
      ],
      hint: "Cannot be combined with Company when set to Account.",
    },
    ...sortParams("Only name is sortable."),
    ...paginationParams(),
  ],
  output: [
    { key: "tags", type: "array", label: "Tags" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Records per page" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalRecords", type: "number", label: "Total matching tags" },
  ],

  async execute(input, ctx) {
    const body = await new CallRailClient(ctx).json<PageMeta & { tags: unknown[] }>(
      `/a/${encodeId(input.accountId)}/tags.json`,
      {
        query: {
          company_id: input.companyId,
          status: input.status,
          tag_level: input.tagLevel,
          sort: input.sort,
          order: input.order,
          page: input.page,
          per_page: input.perPage,
        },
      },
    );
    return {
      tags: body.tags,
      page: body.page,
      perPage: body.per_page,
      totalPages: body.total_pages,
      totalRecords: body.total_records,
    };
  },
};

export default tagList;
