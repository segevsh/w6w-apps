import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult, preferHeaders } from "../lib/client.ts";
import { bodyContentTypeParam, odataParams, pagingParams, timeZoneParam } from "../lib/params.ts";

interface Input {
  startDateTime: string;
  endDateTime: string;
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
 * `GET /me/calendar/calendarView?startDateTime=…&endDateTime=…`, or the
 * per-calendar form `GET /me/calendars/{id}/calendarView?…`.
 *
 * https://learn.microsoft.com/en-us/graph/api/user-list-calendarview
 *
 * This is the "what is actually on the calendar between these two moments"
 * query: recurring series are **expanded into occurrences**, and exceptions and
 * single instances come back alongside them. That expansion is the whole reason
 * to prefer it over List Events for anything scheduling-shaped.
 *
 * `startDateTime` and `endDateTime` are required by the endpoint, not merely by
 * this action. Graph interprets each using the offset embedded in the value and
 * treats an offset-less value as UTC — and, unusually, `Prefer: outlook.timezone`
 * does **not** affect how these two are read (only how results are rendered).
 *
 * Requires `Calendars.ReadBasic` at minimum.
 */
const listCalendarView: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-calendar-view",
  type: "read",
  resource: "event",
  title: "List Calendar View",
  description:
    "List every occurrence, exception, and single instance in a date range, with recurring series expanded.",
  params: [
    {
      key: "startDateTime",
      label: "Range start",
      type: "datetime",
      required: true,
      placeholder: "2026-08-01T00:00:00-07:00",
      hint:
        "ISO 8601. Include an offset to be explicit — a value without one is read as UTC, regardless of the Time zone field.",
    },
    {
      key: "endDateTime",
      label: "Range end",
      type: "datetime",
      required: true,
      placeholder: "2026-08-08T00:00:00-07:00",
      hint: "ISO 8601. Same offset rule as Range start.",
    },
    {
      key: "calendarId",
      label: "Calendar ID",
      type: "string",
      hint: "From List Calendars. Leave empty for the default calendar.",
    },
    ...odataParams({ orderbyHint: "OData `$orderby`, e.g. `start/dateTime`." }),
    ...pagingParams({ defaultTop: 50 }),
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
      ? `/me/calendars/${encodeURIComponent(input.calendarId)}/calendarView`
      : "/me/calendar/calendarView";
    const options = {
      query: {
        startDateTime: input.startDateTime,
        endDateTime: input.endDateTime,
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

export default listCalendarView;
