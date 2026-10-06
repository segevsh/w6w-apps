import type { ActionDefinition } from "@w6w/types";
import { filterQuery, UpsalesClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * `GET /api/v2/currencies/` — List the currencies enabled in the account, with exchange rates.
 *
 * Pages with `limit`/`offset` and accepts Upsales filters via `filter`.
 */
interface Input {
  limit?: number;
  offset?: number;
  sort?: string;
  filter?: unknown;
}

const currencyList: ActionDefinition<Input> = {
  key: "currency-list",
  type: "search",
  resource: "currency",
  title: "List Currencies",
  description: "List the currencies enabled in the account, with exchange rates.",
  params: [
    ...listParams,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new UpsalesClient(ctx).list("/currencies/", {
      limit: input.limit,
      offset: input.offset,
      sort: input.sort,
      ...filterQuery(input.filter),
    });
  },
};

export default currencyList;
