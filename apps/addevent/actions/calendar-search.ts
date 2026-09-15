import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import type { AddEventLinks, AddEventPagination } from "../lib/client.ts";
import {
  calendarIdsParam,
  calendarSortByOptions,
  pageParam,
  pageSizeParam,
  sortOrderParam,
} from "../lib/params.ts";
import type { AddEventCalendar } from "../lib/schema.ts";

/**
 * `GET /calendars` — search calendars previously created on this account.
 * Always answers `200`, even for zero matches.
 */
interface Input {
  calendarIds?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
}

interface CalendarSearchResult {
  pagination?: AddEventPagination;
  links?: AddEventLinks;
  calendars?: AddEventCalendar[];
}

const calendarSearch: ActionDefinition<Input> = {
  key: "calendar-search",
  type: "search",
  resource: "calendar",
  title: "Search Calendars",
  description: "Search calendars you've previously created. An empty result is a successful " +
    '"no matches" response.',
  params: [
    calendarIdsParam,
    pageParam,
    pageSizeParam,
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      default: "created",
      advanced: true,
      options: calendarSortByOptions,
    },
    sortOrderParam(),
  ],
  output: [
    { key: "calendars", type: "array", label: "Matching calendars" },
    { key: "pagination", type: "object", label: "Pagination" },
    { key: "links", type: "object", label: "Next/previous page links" },
  ],

  execute(input, ctx) {
    return new AddEventClient(ctx).json<CalendarSearchResult>("/calendars", {
      query: {
        calendar_ids: input.calendarIds,
        page: input.page,
        page_size: input.pageSize,
        sort_by: input.sortBy,
        sort_order: input.sortOrder,
      },
    });
  },
};

export default calendarSearch;
