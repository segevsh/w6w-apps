import type { ActionDefinition } from "@w6w/types";
import { DubClient } from "../lib/client.ts";
import { FILTER_PARAMS, filterQuery } from "../lib/filters.ts";

type Input = Record<string, unknown> & {
  event?: string;
  page?: number;
  limit?: number;
  sortOrder?: string;
};

/**
 * `GET /events` — the raw click, lead or sale stream, page-numbered. The
 * deprecated `order` parameter is not used (`sortOrder` replaces it).
 */
const eventList: ActionDefinition<Input> = {
  key: "event-list",
  type: "search",
  resource: "event",
  title: "List Events",
  description:
    "List individual click, lead or sale events, newest first, one page at a time. Requires a paid Dub plan.",
  params: [
    {
      key: "event",
      label: "Event",
      type: "select",
      options: [
        { value: "clicks", label: "Clicks" },
        { value: "leads", label: "Leads" },
        { value: "sales", label: "Sales" },
      ],
      hint: "Defaults to clicks.",
    },
    ...FILTER_PARAMS,
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "First page is 1.",
      validation: { min: 1, integer: true },
    },
    {
      key: "limit",
      label: "Events per page",
      type: "number",
      hint: "Defaults to 100; maximum 1000.",
      validation: { min: 1, max: 1000, integer: true },
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [{ value: "desc", label: "Newest first" }, { value: "asc", label: "Oldest first" }],
    },
  ],
  output: [{ key: "events", type: "array", label: "Events on this page" }],

  async execute(input, ctx) {
    const events = await new DubClient(ctx).request("GET", "/events", {
      query: {
        event: input.event,
        ...filterQuery(input),
        page: input.page,
        limit: input.limit,
        sortOrder: input.sortOrder,
      },
    });
    return { events };
  },
};

export default eventList;
