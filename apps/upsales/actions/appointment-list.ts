import type { ActionDefinition } from "@w6w/types";
import { filterQuery, UpsalesClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * `GET /api/v2/appointments` — List appointments in Upsales.
 *
 * Pages with `limit`/`offset` and accepts Upsales filters via `filter`.
 */
interface Input {
  limit?: number;
  offset?: number;
  sort?: string;
  filter?: unknown;
}

const appointmentList: ActionDefinition<Input> = {
  key: "appointment-list",
  type: "search",
  resource: "appointment",
  title: "List Appointments",
  description: "List appointments in Upsales.",
  params: [
    ...listParams,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new UpsalesClient(ctx).list("/appointments", {
      limit: input.limit,
      offset: input.offset,
      sort: input.sort,
      ...filterQuery(input.filter),
    });
  },
};

export default appointmentList;
