import type { ActionDefinition } from "@w6w/types";
import { filterQuery, UpsalesClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * `GET /api/v2/accounts` — List companies (accounts) in Upsales.
 *
 * Pages with `limit`/`offset` and accepts Upsales filters via `filter`.
 * The vendor's own list example also passes `isExternal=0` (companies, not prospecting
 * hits); add it through `filter` if you need it.
 */
interface Input {
  limit?: number;
  offset?: number;
  sort?: string;
  filter?: unknown;
}

const companyList: ActionDefinition<Input> = {
  key: "company-list",
  type: "search",
  resource: "company",
  title: "List Companies",
  description: "List companies (accounts) in Upsales.",
  params: [
    ...listParams,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new UpsalesClient(ctx).list("/accounts", {
      limit: input.limit,
      offset: input.offset,
      sort: input.sort,
      ...filterQuery(input.filter),
    });
  },
};

export default companyList;
