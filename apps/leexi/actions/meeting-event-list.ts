import type { ActionDefinition } from "@w6w/types";
import { LeexiClient } from "../lib/client.ts";

interface Input {
  page?: number;
  items?: number;
  order?:
    | "created_at desc"
    | "created_at asc"
    | "start_time desc"
    | "start_time asc"
    | "end_time desc"
    | "end_time asc";
  origin?: "calendar" | "manual" | "api";
  date_filter?: "start_time" | "end_time";
  from?: string;
  to?: string;
}

/** `GET /meeting_events` */
const meetingEventList: ActionDefinition<Input> = {
  key: "meeting-event-list",
  type: "search",
  resource: "meeting-event",
  title: "List Meeting Events",
  description: "List the calendar and API meeting events the Leexi assistant can join.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "First page is 1.",
      validation: { min: 1, integer: true },
    },
    {
      key: "items",
      label: "Items per page",
      type: "number",
      hint: "1-100, defaults to 10.",
      validation: { min: 1, max: 100, integer: true },
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      hint: "Defaults to `start_time desc`.",
      options: [
        { value: "created_at desc", label: "created_at desc" },
        { value: "created_at asc", label: "created_at asc" },
        { value: "start_time desc", label: "start_time desc" },
        { value: "start_time asc", label: "start_time asc" },
        { value: "end_time desc", label: "end_time desc" },
        { value: "end_time asc", label: "end_time asc" },
      ],
    },
    {
      key: "origin",
      label: "Origin",
      type: "select",
      hint: "Filter by meeting event origin.",
      options: [{ value: "calendar", label: "calendar" }, { value: "manual", label: "manual" }, {
        value: "api",
        label: "api",
      }],
    },
    {
      key: "date_filter",
      label: "Date filter",
      type: "select",
      hint: "Which date `from`/`to` apply to. Defaults to start_time.",
      options: [{ value: "start_time", label: "start_time" }, {
        value: "end_time",
        label: "end_time",
      }],
    },
    {
      key: "from",
      label: "From",
      type: "string",
      hint: "YYYY-MM-DDTHH:MM:SS.000Z",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      hint: "YYYY-MM-DDTHH:MM:SS.000Z",
    },
  ],
  output: [
    { key: "data", type: "array", label: "The records on this page" },
    {
      key: "pagination",
      type: "object",
      label: "{ page, items, count, pages } — stop when page reaches pages",
    },
  ],

  async execute(input, ctx) {
    const res = await new LeexiClient(ctx).request("GET", "/meeting_events", {
      query: {
        page: input.page,
        items: input.items,
        order: input.order,
        origin: input.origin,
        date_filter: input.date_filter,
        from: input.from,
        to: input.to,
      },
    });
    return { data: res.data ?? [], pagination: res.pagination ?? null };
  },
};

export default meetingEventList;
