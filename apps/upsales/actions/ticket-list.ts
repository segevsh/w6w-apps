import type { ActionDefinition } from "@w6w/types";
import { filterQuery, UpsalesClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * `GET /api/v2/tickets` — List support tickets in Upsales.
 *
 * Pages with `limit`/`offset` and accepts Upsales filters via `filter`.
 */
interface Input {
  limit?: number;
  offset?: number;
  sort?: string;
  filter?: unknown;
}

const ticketList: ActionDefinition<Input> = {
  key: "ticket-list",
  type: "search",
  resource: "ticket",
  title: "List Tickets",
  description: "List support tickets in Upsales.",
  params: [
    ...listParams,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new UpsalesClient(ctx).list("/tickets", {
      limit: input.limit,
      offset: input.offset,
      sort: input.sort,
      ...filterQuery(input.filter),
    });
  },
};

export default ticketList;
