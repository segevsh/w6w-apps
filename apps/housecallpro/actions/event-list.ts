import type { ActionDefinition } from "@w6w/types";
import { HousecallClient, type NormalizedList } from "../lib/client.ts";
import { companyIdParam, listOutput, paginationParams, sortDirectionParam } from "../lib/params.ts";

/**
 * `GET /events` — calendar events.
 *
 * These are schedule entries that are not jobs: meetings, time off, anything a
 * Pro blocks out. They carry a `recurrence_rule` in iCal format, an address and
 * their own assigned employees. Nothing to do with webhook events, which are
 * pushed rather than listed.
 */
interface Input {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
  companyId?: string;
}

const eventList: ActionDefinition<Input, NormalizedList> = {
  key: "event-list",
  type: "search",
  resource: "event",
  title: "Find Events",
  description: "List calendar events — the non-job entries on the schedule. Not webhook events.",
  params: [
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      default: "created_at",
      options: [
        { value: "created_at", label: "Created at (default)" },
        { value: "updated_at", label: "Updated at" },
        { value: "name", label: "Name" },
        { value: "note", label: "Note" },
        { value: "street", label: "Street" },
        { value: "street_line_2", label: "Street line 2" },
        { value: "city", label: "City" },
        { value: "state", label: "State" },
        { value: "zip", label: "ZIP" },
      ],
    },
    sortDirectionParam,
    ...paginationParams(50),
    companyIdParam,
  ],
  output: listOutput("Events"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list("/events", "events", {
      companyId: input.companyId,
      query: {
        page: input.page,
        page_size: input.pageSize,
        sort_by: input.sortBy,
        sort_direction: input.sortDirection,
      },
    });
  },
};

export default eventList;
