import type { ActionDefinition } from "@w6w/types";
import { flattenMany, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  pageSize?: number;
  pageNumber?: number;
}

/** `GET /api/v2/events` — confirmed against the vendor's OpenAPI spec. */
const eventList: ActionDefinition<Input> = {
  key: "event-list",
  type: "search",
  resource: "event",
  title: "List Events",
  description: "List events in this nation.",
  params: [...pagination],
  output: [{ key: "items", type: "array", label: "Events" }],

  async execute(input, ctx) {
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>("/events", {
      query: { "page[size]": input.pageSize, "page[number]": input.pageNumber },
    });
    return { items: flattenMany(Array.isArray(res.data) ? res.data : []) };
  },
};

export default eventList;
