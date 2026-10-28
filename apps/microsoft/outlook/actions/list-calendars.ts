import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult } from "../lib/client.ts";
import { odataParams, pagingParams } from "../lib/params.ts";

interface Input {
  filter?: string;
  select?: string[];
  orderby?: string;
  top?: number;
  skip?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /me/calendars` — the calendars this mailbox can see.
 *
 * https://learn.microsoft.com/en-us/graph/api/user-list-calendars
 *
 * Mostly a discovery step: the `id` values it returns are what the event
 * actions take as `calendarId`. The default calendar needs no id at all — every
 * event action falls back to `/me/events` when `calendarId` is empty.
 *
 * Requires `Calendars.ReadBasic` at minimum.
 */
const listCalendars: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-calendars",
  type: "read",
  resource: "calendar",
  title: "List Calendars",
  description: "List the calendars available to the signed-in user.",
  params: [
    ...odataParams({ orderbyHint: "OData `$orderby`, e.g. `name`." }),
    ...pagingParams({ defaultTop: 50 }),
  ],
  output: [
    { key: "value", type: "array", label: "Calendars" },
    { key: "nextLink", type: "string", label: "Next link" },
    { key: "pages", type: "number", label: "Pages fetched" },
  ],

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const options = {
      query: {
        $filter: input.filter,
        $select: odataList(input.select),
        $orderby: input.orderby,
        $top: input.top,
        $skip: input.skip,
      },
    };

    const target = input.nextLink ?? "/me/calendars";
    const opts = input.nextLink ? {} : options;

    return input.all
      ? client.collect(target, opts, input.maxPages ?? 10)
      : client.page(target, opts);
  },
};

export default listCalendars;
