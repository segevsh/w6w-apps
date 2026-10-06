import type { ActionDefinition } from "@w6w/types";
import { SalesmateClient } from "../lib/client.ts";
import { buildSearch, type SearchInput, searchOutput, searchParams } from "../lib/params.ts";

/** Fields returned when the caller names none — all taken from the reference's own sample body. */
const DEFAULT_FIELDS = [
  "deal.id",
  "deal.title",
  "deal.pipeline",
  "deal.stage",
  "deal.status",
  "deal.owner.id",
  "deal.owner.name",
  "deal.dealValue",
  "deal.currency",
  "deal.estimatedCloseDate",
  "deal.priority",
  "deal.source",
  "deal.tags",
  "deal.primaryContact.id",
  "deal.primaryContact.name",
  "deal.primaryCompany.id",
  "deal.primaryCompany.name",
  "deal.lastModifiedAt",
];

const dealSearch: ActionDefinition<SearchInput> = {
  key: "deal-search",
  type: "search",
  resource: "deal",
  title: "Search Deals",
  description:
    "Search deals with filter rules. With no rules it returns every deal, up to `rows` per request.",
  params: searchParams.map((p) =>
    p.key === "rows" || p.key === "from" ? { ...p, default: undefined } : p
  ),
  output: searchOutput,

  async execute(input, ctx) {
    const data = await new SalesmateClient(ctx).request<
      { data?: unknown[]; totalRows?: number; totalPages?: number }
    >("/deal/v4/search", {
      method: "POST",
      query: { rows: input.rows, from: input.from },
      body: buildSearch("deal", DEFAULT_FIELDS, input),
    });
    return {
      records: data?.data ?? [],
      totalRows: data?.totalRows,
      totalPages: data?.totalPages,
    };
  },
};

export default dealSearch;
