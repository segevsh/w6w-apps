import type { ActionDefinition } from "@w6w/types";
import { filterQuery, UpsalesClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * `GET /api/v2/todoTypes` — List activity types (the to-do and phone-call types an activity can have).
 *
 * Pages with `limit`/`offset` and accepts Upsales filters via `filter`.
 */
interface Input {
  limit?: number;
  offset?: number;
  sort?: string;
  filter?: unknown;
}

const activityTypeList: ActionDefinition<Input> = {
  key: "activity-type-list",
  type: "search",
  resource: "activity",
  title: "List Activity Types",
  description: "List activity types (the to-do and phone-call types an activity can have).",
  params: [
    ...listParams,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new UpsalesClient(ctx).list("/todoTypes", {
      limit: input.limit,
      offset: input.offset,
      sort: input.sort,
      ...filterQuery(input.filter),
    });
  },
};

export default activityTypeList;
