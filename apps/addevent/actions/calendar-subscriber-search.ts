import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import type { AddEventLinks, AddEventPagination } from "../lib/client.ts";
import {
  calendarIdsParam,
  pageParam,
  pageSizeParam,
  sortOrderParam,
  subscriberSortByOptions,
  subscriberStatusOptions,
} from "../lib/params.ts";
import type { AddEventSubscriber } from "../lib/schema.ts";

/**
 * `GET /subscribers` — search calendar subscribers. Always answers `200`, even for
 * zero matches.
 *
 * Defaults to `status=active`, matching the vendor's own default — leave it empty
 * (all three values) to see inactive and blocked subscribers too.
 */
interface Input {
  calendarIds?: string;
  status?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
}

interface SubscriberSearchResult {
  pagination?: AddEventPagination;
  links?: AddEventLinks;
  subscribers?: AddEventSubscriber[];
}

const calendarSubscriberSearch: ActionDefinition<Input> = {
  key: "calendar-subscriber-search",
  type: "search",
  resource: "calendar-subscriber",
  title: "Search Calendar Subscribers",
  description: "Search subscribers to your calendars. An empty result is a successful " +
    '"no matches" response.',
  params: [
    calendarIdsParam,
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      default: ["active"],
      options: subscriberStatusOptions,
      hint: "Defaults to active only, matching the API. Leave empty and pick all three to see " +
        "everyone.",
    },
    pageParam,
    pageSizeParam,
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      default: "created",
      advanced: true,
      options: subscriberSortByOptions,
    },
    sortOrderParam(),
  ],
  output: [
    { key: "subscribers", type: "array", label: "Matching subscribers" },
    { key: "pagination", type: "object", label: "Pagination" },
    { key: "links", type: "object", label: "Next/previous page links" },
  ],

  execute(input, ctx) {
    return new AddEventClient(ctx).json<SubscriberSearchResult>("/subscribers", {
      query: {
        calendar_ids: input.calendarIds,
        status: input.status,
        page: input.page,
        page_size: input.pageSize,
        sort_by: input.sortBy,
        sort_order: input.sortOrder,
      },
    });
  },
};

export default calendarSubscriberSearch;
