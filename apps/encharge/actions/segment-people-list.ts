import type { ActionDefinition } from "@w6w/types";
import { EnchargeClient, encodeId } from "../lib/client.ts";
import type { QueryPairs } from "../lib/client.ts";

/**
 * List People in Segment — `GET /v1/segments/{segmentId}/people`. Verified against the OpenAPI
 * document (`GetPeopleInSegment`), fetched 2026-10-06: `limit`, `offset` (default 0),
 * `attributes` (an array of person field names), `sort` and `order` (`asc`|`desc`).
 */
interface Input {
  segmentId: number | string;
  limit?: number;
  offset?: number;
  attributes?: string;
  sort?: string;
  order?: "asc" | "desc";
}

const segmentPeopleList: ActionDefinition<Input> = {
  key: "segment-people-list",
  type: "read",
  resource: "segments",
  title: "List People in Segment",
  description: "List the people currently in a segment, with optional paging, sorting and a " +
    "choice of which person fields to return.",
  params: [
    {
      key: "segmentId",
      label: "Segment ID",
      type: "number",
      required: true,
      hint: "From List Segments (`id`).",
    },
    { key: "limit", label: "Limit", type: "number", hint: "Number of people to retrieve." },
    { key: "offset", label: "Offset", type: "number", hint: "Number of records to skip." },
    {
      key: "attributes",
      label: "Fields to return",
      type: "string",
      hint: "Comma-separated person field names, e.g. email,firstName. All fields when empty.",
    },
    { key: "sort", label: "Sort by", type: "string", hint: "A person field name." },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
    },
  ],
  output: [{ key: "people", type: "array", label: "The people in the segment" }],

  async execute(input, ctx) {
    const id = String(input.segmentId ?? "").trim();
    if (!id) throw new Error("`segmentId` is required.");
    const query: QueryPairs = [
      ["limit", input.limit],
      ["offset", input.offset],
      ["sort", input.sort],
      ["order", input.order],
    ];
    // `attributes` is an array query parameter: one `attributes=` pair per name.
    for (const name of (input.attributes ?? "").split(",")) {
      if (name.trim()) query.push(["attributes", name.trim()]);
    }
    return await new EnchargeClient(ctx).request("GET", `/segments/${encodeId(id)}/people`, {
      query,
    });
  },
};

export default segmentPeopleList;
