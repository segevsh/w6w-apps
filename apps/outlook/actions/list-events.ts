import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult, preferHeaders } from "../lib/client.ts";
import { bodyContentTypeParam, odataParams, pagingParams, timeZoneParam } from "../lib/params.ts";

interface Input {
  calendarId?: string;
  filter?: string;
  select?: string[];
  orderby?: string;
  top?: number;
  skip?: number;
  timeZone?: string;
  bodyContentType?: string;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /me/events`, or `GET /me/calendars/{id}/events`.
 *
 * https://learn.microsoft.com/en-us/graph/api/user-list-events
 *
 * Important distinction from List Calendar View: this returns single-instance
 * meetings and *series masters* — a weekly stand-up appears once, not fifty-two
 * times. When you want the occurrences inside a date range, use List Calendar
 * View instead.
 *
 * Requires `Calendars.ReadBasic` at minimum.
 */
const listEvents: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-events",
  type: "read",
  resource: "event",
  title: "List Events",
  description:
    "List events on a calendar. Recurring series are returned as one master, not expanded.",
  params: [
    {
      key: "calendarId",
      label: "Calendar ID",
      type: "string",
      hint: "From List Calendars. Leave empty for the default calendar.",
    },
    ...odataParams({
      filterHint:
        "OData `$filter`, e.g. `start/dateTime ge '2026-01-01T00:00:00'`. Graph does not support filtering on the `recurrence` property.",
      orderbyHint: "OData `$orderby`, e.g. `start/dateTime`.",
    }),
    ...pagingParams({ defaultTop: 25 }),
    timeZoneParam,
    bodyContentTypeParam,
  ],
  output: [
    { key: "value", type: "array", label: "Events" },
    { key: "nextLink", type: "string", label: "Next link" },
    { key: "pages", type: "number", label: "Pages fetched" },
  ],

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const path = input.calendarId
      ? `/me/calendars/${encodeURIComponent(input.calendarId)}/events`
      : "/me/events";
    const options = {
      query: {
        $filter: input.filter,
        $select: odataList(input.select),
        $orderby: input.orderby,
        $top: input.top,
        $skip: input.skip,
      },
      headers: preferHeaders({
        timeZone: input.timeZone,
        bodyContentType: input.bodyContentType,
      }),
    };

    const target = input.nextLink ?? path;
    const opts = input.nextLink ? { headers: options.headers } : options;

    return input.all
      ? client.collect(target, opts, input.maxPages ?? 10)
      : client.page(target, opts);
  },
};

export default listEvents;
