import type { ActionDefinition } from "@w6w/types";
import { CircleClient, unset } from "../lib/client.ts";
import {
  eventSortOptions,
  listOutput,
  pageParam,
  perPageParam,
  spaceIdParam,
} from "../lib/params.ts";

/**
 * `GET /events` — events across the community or in one event space.
 *
 * ## The date filters are bracketed parameter names, literally
 *
 * They are not a nested object. The parameter table names them
 * `filter_date[start_date]` and `filter_date[end_date]`, both `format: date`,
 * both documented as `YYYY-MM-DD`. That is Rails' query syntax reaching the
 * surface, and the brackets are part of the key on the wire. This action sends
 * exactly those strings rather than a `filter_date` object, which would
 * serialise to something the endpoint has never seen.
 *
 * They are `date`, not `datetime`. Sending a full timestamp is not what the
 * format declares, so the params are typed `date` and the hint says so — a
 * silently-truncated or silently-rejected time is worse than a form that asks
 * for the right thing.
 *
 * ## The default sort is not in the enum
 *
 * The parameter documents three values — `oldest`, `start_date`,
 * `start_date_desc` — and then adds "default is newest (by created_at)". So
 * "newest" is a real behaviour with no token to request it: leaving the field
 * blank is the only way to get it, which is why no default is set here.
 *
 * Note also that the useful sort is `start_date`, not the default: a calendar
 * integration almost always wants events in the order they happen, not in the
 * order someone created them.
 */
interface Input {
  spaceId?: number;
  startDate?: string;
  endDate?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

const eventList: ActionDefinition<Input> = {
  key: "event-list",
  type: "search",
  resource: "event",
  title: "List Events",
  description: "Page through events, optionally narrowed to one event space or a date window.",
  params: [
    spaceIdParam(false, "Narrow to one Events-type space. `space-list` returns the ids and types."),
    {
      key: "startDate",
      label: "From date",
      type: "date",
      hint: "`YYYY-MM-DD`. A date, not a timestamp — Circle declares this parameter as a date.",
    },
    { key: "endDate", label: "To date", type: "date", hint: "`YYYY-MM-DD`." },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: eventSortOptions,
      hint: "Leave blank for Circle's default, which is newest by creation time — there is no " +
        "token for it. Pick `start_date` for calendar order.",
    },
    pageParam,
    perPageParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/events", {
      query: {
        space_id: input.spaceId,
        // Bracketed keys, verbatim from the parameter table. Not a nested object.
        "filter_date[start_date]": unset(input.startDate),
        "filter_date[end_date]": unset(input.endDate),
        sort: unset(input.sort),
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default eventList;
