import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import type { AddEventLinks, AddEventPagination } from "../lib/client.ts";
import {
  attendeeSortByOptions,
  attendingOptions,
  calendarIdsParam,
  eventIdsParam,
  pageParam,
  pageSizeParam,
  sortOrderParam,
} from "../lib/params.ts";
import type { AddEventAttendee } from "../lib/schema.ts";

/**
 * `GET /rsvps` — search RSVP attendees previously created. Always answers `200`,
 * even for zero matches.
 */
interface Input {
  calendarIds?: string;
  eventIds?: string;
  attending?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
}

interface AttendeeSearchResult {
  pagination?: AddEventPagination;
  links?: AddEventLinks;
  rsvps?: AddEventAttendee[];
}

const rsvpAttendeeSearch: ActionDefinition<Input> = {
  key: "rsvp-attendee-search",
  type: "search",
  resource: "rsvp-attendee",
  title: "Search RSVP Attendees",
  description: "Search RSVP attendees previously created. An empty result is a successful " +
    '"no matches" response.',
  params: [
    calendarIdsParam,
    eventIdsParam,
    {
      key: "attending",
      label: "Response",
      type: "multiselect",
      options: attendingOptions,
      hint: "Limit to attendees who responded with one of these. Leave empty for all.",
    },
    pageParam,
    pageSizeParam,
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      default: "created",
      advanced: true,
      options: attendeeSortByOptions,
    },
    sortOrderParam(),
  ],
  output: [
    { key: "rsvps", type: "array", label: "Matching RSVP attendees" },
    { key: "pagination", type: "object", label: "Pagination" },
    { key: "links", type: "object", label: "Next/previous page links" },
  ],

  execute(input, ctx) {
    return new AddEventClient(ctx).json<AttendeeSearchResult>("/rsvps", {
      query: {
        calendar_ids: input.calendarIds,
        event_ids: input.eventIds,
        attending: input.attending,
        page: input.page,
        page_size: input.pageSize,
        sort_by: input.sortBy,
        sort_order: input.sortOrder,
      },
    });
  },
};

export default rsvpAttendeeSearch;
