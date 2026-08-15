import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId, type PageMeta } from "../lib/client.ts";
import {
  accountIdParam,
  companyIdParam,
  fieldsParam,
  paginationParams,
  sortParams,
} from "../lib/params.ts";

/**
 * `GET /v3/a/{account_id}/trackers.json` — Listing All Trackers.
 *
 * Creating a tracker is deliberately not implemented as an action: the
 * request body's shape depends entirely on `type` (`source` vs `session`) —
 * different required fields, a `pool_numbers`/`pool_size` pair only session
 * trackers take, and a `source` object whose own shape varies again by
 * search-vs-offline source type. Modeling that faithfully as one static
 * `Param[]` risks shipping a form that silently drops fields CallRail
 * actually needs; left out rather than guessed at.
 */
interface Input {
  accountId: string;
  companyId?: string;
  type?: "session" | "source";
  status?: "active" | "disabled";
  search?: string;
  fields?: string;
  sort?: "name";
  order?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

const trackerList: ActionDefinition<Input> = {
  key: "tracker-list",
  type: "search",
  resource: "tracker",
  title: "List Trackers",
  description: "List tracking numbers within a CallRail account.",
  params: [
    accountIdParam,
    companyIdParam,
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "session", label: "Session (Keyword Pool)" },
        { value: "source", label: "Source" },
      ],
    },
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
    { ...fieldsParam, hint: "e.g. campaign_name, swap_targets." },
    ...sortParams("Only name is sortable."),
    ...paginationParams(),
  ],
  output: [
    { key: "trackers", type: "array", label: "Trackers" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Records per page" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalRecords", type: "number", label: "Total matching trackers" },
  ],

  async execute(input, ctx) {
    const body = await new CallRailClient(ctx).json<PageMeta & { trackers: unknown[] }>(
      `/a/${encodeId(input.accountId)}/trackers.json`,
      {
        query: {
          company_id: input.companyId,
          type: input.type,
          status: input.status,
          search: input.search,
          fields: input.fields,
          sort: input.sort,
          order: input.order,
          page: input.page,
          per_page: input.perPage,
        },
      },
    );
    return {
      trackers: body.trackers,
      page: body.page,
      perPage: body.per_page,
      totalPages: body.total_pages,
      totalRecords: body.total_records,
    };
  },
};

export default trackerList;
