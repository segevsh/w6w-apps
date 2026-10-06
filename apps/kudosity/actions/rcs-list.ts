import type { ActionDefinition } from "@w6w/types";
import { KudosityClient } from "../lib/client.ts";

/**
 * `GET /v2/rcs/messages` — newest first, cursor-paged. Answers
 * `{data: {messages}, meta: {pagination: {next_cursor, prev_cursor, has_next, has_prev}}}`.
 * Preset ranges use the account timezone; `custom_date` needs both dates (max 90 days apart);
 * `all` reaches back 365 days.
 */
interface Input {
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  cursor?: string;
  direction?: string;
}

const rcsList: ActionDefinition<Input> = {
  key: "rcs-list",
  type: "search",
  resource: "rcs",
  title: "List RCS Messages",
  description: "List RCS messages for the account, newest first, with cursor pagination.",
  params: [
    {
      key: "dateRange",
      label: "Date range",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "All (up to 365 days)" },
        { value: "last_week", label: "Last 7 days" },
        { value: "last_thirty", label: "Last 30 days" },
        { value: "last_month", label: "Previous calendar month" },
        { value: "custom_date", label: "Custom (needs start and end date)" },
      ],
    },
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      hint: "RFC 3339. Required with the custom range.",
    },
    {
      key: "endDate",
      label: "End date",
      type: "string",
      hint: "RFC 3339. At most 90 days after the start.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 25,
      validation: { min: 1, max: 100, integer: true },
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "next_cursor or prev_cursor from a previous result. Omit for the first page.",
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      default: "next",
      options: [
        { value: "next", label: "Next (older)" },
        { value: "prev", label: "Previous (newer)" },
      ],
    },
  ],
  output: [
    { key: "messages", type: "array", label: "Messages" },
    { key: "pagination", type: "object", label: "Pagination (next_cursor, has_next, …)" },
  ],

  async execute(input, ctx) {
    const { data, meta } = await new KudosityClient(ctx).data<{ messages?: unknown[] }>(
      "/rcs/messages",
      {
        query: {
          date_range: input.dateRange,
          start_date: input.startDate,
          end_date: input.endDate,
          limit: input.limit,
          cursor: input.cursor,
          direction: input.direction,
        },
      },
    );
    return { messages: data?.messages ?? [], pagination: meta?.pagination ?? null };
  },
};

export default rcsList;
