import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import type { AddEventLinks, AddEventPagination } from "../lib/client.ts";
import {
  calendarIdsParam,
  customDataKeyParam,
  customDataValueParam,
  DATETIME_HINT,
  eventIdsParam,
  eventSortByOptions,
  pageParam,
  pageSizeParam,
  sortOrderParam,
} from "../lib/params.ts";
import type { AddEventEvent } from "../lib/schema.ts";

/**
 * `GET /events` — search events previously created on this account.
 *
 * Always answers `200`, even for zero matches: an empty `events` array is a
 * successful "no matches" response, not an error — the vendor's own docs call this
 * out explicitly.
 *
 * Sorting defaults to `created, desc`, but switches to `datetime_start, asc`
 * automatically the moment `datetimeMin`/`datetimeMax` is set — that default-flip is
 * the vendor's own documented behaviour, not something this action decides.
 */
interface Input {
  calendarIds?: string;
  eventIds?: string;
  datetimeMin?: string;
  datetimeMax?: string;
  search?: string;
  customDataKey?: string;
  customDataValue?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
}

interface EventSearchResult {
  pagination?: AddEventPagination;
  links?: AddEventLinks;
  events?: AddEventEvent[];
}

const eventSearch: ActionDefinition<Input> = {
  key: "event-search",
  type: "search",
  resource: "event",
  title: "Search Events",
  description: "Search events you've previously created. An empty result is a successful " +
    '"no matches" response.',
  params: [
    calendarIdsParam,
    eventIdsParam,
    {
      key: "datetimeMin",
      label: "Ends after",
      type: "string",
      advanced: true,
      hint: `Wire field datetime_min: only events that end at or after this time. ${DATETIME_HINT}`,
    },
    {
      key: "datetimeMax",
      label: "Starts before",
      type: "string",
      advanced: true,
      hint: `Wire field datetime_max: only events that start at or before this time. ` +
        `${DATETIME_HINT}`,
    },
    {
      key: "search",
      label: "Search text",
      type: "string",
      hint: "Case-insensitive search across title, internal_name, description and location.",
    },
    customDataKeyParam,
    customDataValueParam,
    pageParam,
    pageSizeParam,
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      default: "created",
      advanced: true,
      options: eventSortByOptions,
    },
    sortOrderParam(),
  ],
  output: [
    { key: "events", type: "array", label: "Matching events" },
    { key: "pagination", type: "object", label: "Pagination" },
    { key: "links", type: "object", label: "Next/previous page links" },
  ],

  execute(input, ctx) {
    return new AddEventClient(ctx).json<EventSearchResult>("/events", {
      query: {
        calendar_ids: input.calendarIds,
        event_ids: input.eventIds,
        datetime_min: input.datetimeMin,
        datetime_max: input.datetimeMax,
        search: input.search,
        custom_data_key: input.customDataKey,
        custom_data_value: input.customDataValue,
        page: input.page,
        page_size: input.pageSize,
        sort_by: input.sortBy,
        sort_order: input.sortOrder,
      },
    });
  },
};

export default eventSearch;
