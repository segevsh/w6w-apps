import type { ActionDefinition } from "@w6w/types";
import { SalesmateClient } from "../lib/client.ts";
import { buildSearch, type SearchInput, searchOutput, searchParams } from "../lib/params.ts";

/** Fields returned when the caller names none — all taken from the reference's own sample body. */
const DEFAULT_FIELDS = ["company.id", "company.name"];

const companySearch: ActionDefinition<SearchInput> = {
  key: "company-search",
  type: "search",
  resource: "company",
  title: "Search Companies",
  description:
    "Search companies with filter rules. With no rules it returns every company, up to `rows` per request.",
  params: searchParams,
  output: searchOutput,

  async execute(input, ctx) {
    const data = await new SalesmateClient(ctx).request<
      { data?: unknown[]; totalRows?: number; totalPages?: number }
    >("/company/v4/search", {
      method: "POST",
      query: { rows: input.rows, from: input.from },
      body: buildSearch("company", DEFAULT_FIELDS, input),
    });
    return {
      records: data?.data ?? [],
      totalRows: data?.totalRows,
      totalPages: data?.totalPages,
    };
  },
};

export default companySearch;
