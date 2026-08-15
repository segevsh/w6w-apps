import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId, type PageMeta } from "../lib/client.ts";
import { accountIdParam, paginationParams, sortParams } from "../lib/params.ts";

/** `GET /v3/a/{account_id}/companies.json` — Listing All Companies. */
interface Input {
  accountId: string;
  status?: "active" | "disabled";
  search?: string;
  sort?: "name";
  order?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

const companyList: ActionDefinition<Input> = {
  key: "company-list",
  type: "search",
  resource: "company",
  title: "List Companies",
  description: "List the companies within a CallRail account.",
  params: [
    accountIdParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "disabled", label: "Disabled" },
      ],
    },
    { key: "search", label: "Search by name", type: "string" },
    ...sortParams("Only name is sortable."),
    ...paginationParams(),
  ],
  output: [
    { key: "companies", type: "array", label: "Companies" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Records per page" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalRecords", type: "number", label: "Total matching companies" },
  ],

  async execute(input, ctx) {
    const body = await new CallRailClient(ctx).json<PageMeta & { companies: unknown[] }>(
      `/a/${encodeId(input.accountId)}/companies.json`,
      {
        query: {
          status: input.status,
          search: input.search,
          sort: input.sort,
          order: input.order,
          page: input.page,
          per_page: input.perPage,
        },
      },
    );
    return {
      companies: body.companies,
      page: body.page,
      perPage: body.per_page,
      totalPages: body.total_pages,
      totalRecords: body.total_records,
    };
  },
};

export default companyList;
