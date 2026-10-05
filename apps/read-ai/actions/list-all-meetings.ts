import type { ActionDefinition } from "@w6w/types";
import { EXPAND_FIELDS, pickExpand, ReadAiClient, timeFilters } from "../lib/client.ts";
import { expandParam, timeParams } from "../lib/params.ts";

interface Input {
  maxMeetings?: number;
  startTimeMsGt?: number;
  startTimeMsGte?: number;
  startTimeMsLt?: number;
  startTimeMsLte?: number;
  expand?: string[];
}

/** Read AI's page size is capped at 10, so N meetings cost ceil(N/10) calls. */
const PAGE = 10;
const HARD_CAP = 500;

/**
 * Walk the cursor (`cursor` = id of the last meeting on the previous page)
 * until `has_more` is false or `maxMeetings` is reached. The limit is 100
 * requests/minute per user, which bounds this at 1,000 meetings a minute —
 * hence the 500 ceiling, which keeps one step well inside it.
 */
const listAllMeetings: ActionDefinition<Input> = {
  key: "list-all-meetings",
  type: "read",
  resource: "meeting",
  title: "List All Meetings",
  description:
    "Page through Read AI meetings newest-first, following the cursor, up to a maximum count " +
    "(10 meetings per API call; rate limit 100 calls/minute).",
  params: [
    {
      key: "maxMeetings",
      label: "Maximum meetings",
      type: "number",
      default: 50,
      hint: "1–500. Each 10 meetings costs one API call.",
      validation: { integer: true, min: 1, max: HARD_CAP },
    },
    ...timeParams,
    expandParam(),
  ],
  output: [
    { key: "data", type: "array", label: "Meetings" },
    { key: "count", type: "number", label: "Meetings returned" },
    { key: "has_more", type: "boolean", label: "True if the maximum stopped the walk early" },
  ],

  async execute(input, ctx) {
    const max = Math.min(Math.max(Math.trunc(input.maxMeetings ?? 50), 1), HARD_CAP);
    const client = new ReadAiClient(ctx);
    const filters = timeFilters(input);
    const expand = pickExpand(input.expand, EXPAND_FIELDS);

    const meetings: Array<{ id?: string }> = [];
    let cursor: string | undefined;
    let hasMore = false;
    while (meetings.length < max) {
      const page = await client.get<{ has_more?: boolean; data?: Array<{ id?: string }> }>(
        "/v1/meetings",
        { limit: Math.min(PAGE, max - meetings.length), cursor, ...filters, expand },
      );
      const data = page.data ?? [];
      meetings.push(...data);
      hasMore = page.has_more === true;
      cursor = data[data.length - 1]?.id;
      // An empty page or a missing id would loop forever on the same cursor.
      if (!hasMore || !cursor) break;
    }
    return { data: meetings, count: meetings.length, has_more: hasMore };
  },
};

export default listAllMeetings;
