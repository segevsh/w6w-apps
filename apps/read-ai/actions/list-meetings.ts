import type { ActionDefinition } from "@w6w/types";
import { EXPAND_FIELDS, pickExpand, ReadAiClient, timeFilters } from "../lib/client.ts";
import { expandParam, timeParams } from "../lib/params.ts";

interface Input {
  limit?: number;
  cursor?: string;
  startTimeMsGt?: number;
  startTimeMsGte?: number;
  startTimeMsLt?: number;
  startTimeMsLte?: number;
  expand?: string[];
}

/**
 * `GET /v1/meetings` — one page, newest first.
 *
 * The vendor's `limit` default AND maximum are both 10, so there is no way to
 * ask for a bigger page; `list-all-meetings` walks the cursor for that.
 */
const listMeetings: ActionDefinition<Input> = {
  key: "list-meetings",
  type: "read",
  resource: "meeting",
  title: "List Meetings",
  description:
    "List Read AI meetings newest-first, optionally within a start-time window. One page of at " +
    "most 10; pass the last meeting's id as the cursor for the next page.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 10,
      hint: "1–10. Read AI's maximum page size is 10.",
      validation: { integer: true, min: 1, max: 10 },
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "The id of the last meeting from the previous page.",
    },
    ...timeParams,
    expandParam(),
  ],
  output: [
    { key: "object", type: "string", label: 'Always "list"' },
    { key: "has_more", type: "boolean", label: "Whether another page exists" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page, when has_more" },
    { key: "data", type: "array", label: "Meetings" },
  ],

  async execute(input, ctx) {
    const page = await new ReadAiClient(ctx).get<
      { object?: string; has_more?: boolean; data?: Array<{ id?: string }> }
    >("/v1/meetings", {
      limit: input.limit,
      cursor: input.cursor,
      ...timeFilters(input),
      expand: pickExpand(input.expand, EXPAND_FIELDS),
    });
    const data = page.data ?? [];
    return {
      object: page.object ?? "list",
      has_more: page.has_more === true,
      next_cursor: page.has_more ? data[data.length - 1]?.id : undefined,
      data,
    };
  },
};

export default listMeetings;
