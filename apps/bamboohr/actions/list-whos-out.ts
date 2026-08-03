import type { ActionDefinition } from "@w6w/types";
import { BambooClient } from "../lib/client.ts";

interface Input {
  start?: string;
  end?: string;
  /**
   * Boolean, not the raw `filter` string: the wire value has exactly one legal
   * form (`off`), and the flag reads as "ignore the saved calendar filter".
   */
  filter?: boolean;
}

/**
 * `GET /api/v1/time_off/whos_out` — the Who's Out calendar.
 *
 * The cheapest possible "who is away" call: no employee ID, no required window,
 * and a small response. `start` defaults to today and `end` to "14 days after
 * the start date", so a bare call answers the fortnight ahead.
 *
 * The `filter` parameter is the subtle part, and it is the reverse of what the
 * name suggests. By default — parameter OMITTED — results are already narrowed:
 * "results are limited to the set of employees defined by the authenticated
 * user's saved Who's Out calendar filter (the same filter applied to their
 * in-app Who's Out view)". Passing the single documented value `off` turns that
 * saved filter OFF, widening the result to everyone.
 *
 * So the param is exposed as a boolean labelled for what it does — "ignore the
 * saved calendar filter" — rather than as a raw string named `filter` that reads
 * as "narrow this". A user with no saved filter sees all employees either way.
 */
const listWhosOut: ActionDefinition<Input> = {
  key: "list-whos-out",
  type: "search",
  resource: "time-off",
  title: "List Who's Out",
  description:
    "List time off and holidays in a date range — the Who's Out calendar. Defaults to the next " +
    "14 days.",
  params: [
    {
      key: "start",
      label: "Start date",
      type: "date",
      hint: "YYYY-MM-DD. Defaults to today.",
    },
    {
      key: "end",
      label: "End date",
      type: "date",
      hint: "YYYY-MM-DD. Defaults to 14 days after the start date.",
    },
    {
      key: "filter",
      label: "Ignore saved calendar filter",
      type: "boolean",
      hint:
        "By default BambooHR applies the key holder's saved Who's Out calendar filter, so the " +
        "result matches what they see in-app. Enable this to bypass that filter and return every " +
        "employee. (Sends the documented `filter=off`.)",
    },
  ],
  output: [{ key: "items", type: "array", label: "Time off entries and company holidays" }],

  execute(input, ctx) {
    return new BambooClient(ctx).request("/time_off/whos_out", {
      query: {
        start: input.start,
        end: input.end,
        // `off` is the only documented value; anything else is not sent at all.
        filter: input.filter ? "off" : undefined,
      },
    });
  },
};

export default listWhosOut;
