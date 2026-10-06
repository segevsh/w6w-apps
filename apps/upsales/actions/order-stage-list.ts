import type { ActionDefinition } from "@w6w/types";
import { filterQuery, UpsalesClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * `GET /api/v2/orderstages` — List order or opportunity stages in Upsales.
 *
 * Pages with `limit`/`offset` and accepts Upsales filters via `filter`.
 */
interface Input {
  limit?: number;
  offset?: number;
  sort?: string;
  filter?: unknown;
}

const orderStageList: ActionDefinition<Input> = {
  key: "order-stage-list",
  type: "search",
  resource: "order",
  title: "List Order Stages",
  description: "List order or opportunity stages in Upsales.",
  params: [
    ...listParams,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new UpsalesClient(ctx).list("/orderstages", {
      limit: input.limit,
      offset: input.offset,
      sort: input.sort,
      ...filterQuery(input.filter),
    });
  },
};

export default orderStageList;
