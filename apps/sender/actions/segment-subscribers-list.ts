import type { ActionDefinition } from "@w6w/types";
import { SenderClient, type SenderListPage } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

/** `GET /v2/segments/{id}/subscribers` — every subscriber matching a segment. */
interface Input {
  id: string;
  page?: number;
  limit?: number;
  order?: string;
  direction?: string;
}

const segmentSubscribersList: ActionDefinition<Input> = {
  key: "segment-subscribers-list",
  type: "search",
  resource: "segment",
  title: "List Subscribers In Segment",
  description: "List every subscriber matching the specified segment.",
  params: [
    { key: "id", label: "Segment ID", type: "string", required: true },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Subscribers" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).json<SenderListPage<unknown>>(
      `/segments/${encodeURIComponent(input.id)}/subscribers`,
      { query: paginationQuery(input) },
    );
  },
};

export default segmentSubscribersList;
