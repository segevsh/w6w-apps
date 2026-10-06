import type { ActionDefinition } from "@w6w/types";
import { compact, type Page, pagingParams, SavvyCalClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  after?: string;
  before?: string;
  state?: string;
  period?: string;
  from?: string;
  until?: string;
  direction?: string;
  attendance?: string;
  link?: string;
}

const opts = (values: string[]) => values.map((v) => ({ value: v, label: v }));

const eventList: ActionDefinition<Input> = {
  key: "event-list",
  type: "read",
  resource: "event",
  title: "List Events",
  description:
    "List events scheduled via SavvyCal, one cursor page at a time. Vendor defaults: confirmed " +
    "events, upcoming, ascending, only those you attend.",
  params: [
    ...pagingParams,
    {
      key: "state",
      label: "State",
      type: "select",
      options: opts([
        "all",
        "confirmed",
        "canceled",
        "awaiting_reschedule",
        "awaiting_checkout",
        "checkout_expired",
        "awaiting_approval",
        "declined",
        "tentative",
      ]),
      hint: "Filter by event state (vendor default: confirmed).",
    },
    {
      key: "period",
      label: "Period",
      type: "select",
      options: opts(["past", "upcoming", "fixed", "all"]),
      hint: "Vendor default: upcoming. `fixed` uses From / Until.",
    },
    { key: "from", label: "From (date)", type: "string", hint: "YYYY-MM-DD; with period=fixed." },
    { key: "until", label: "Until (date)", type: "string", hint: "YYYY-MM-DD; with period=fixed." },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: opts(["asc", "desc"]),
    },
    {
      key: "attendance",
      label: "Attendance",
      type: "select",
      options: opts(["attending", "any"]),
      hint: "`any` returns every event the user can access, not only those they attend.",
    },
    { key: "link", label: "Link ID", type: "string", hint: "Only events booked on this link." },
  ],
  output: [
    { key: "entries", type: "array", label: "Events" },
    { key: "metadata", type: "object", label: "Cursors: after, before, limit" },
  ],

  execute(input, ctx) {
    return new SavvyCalClient(ctx).json<Page<unknown>>("/events", {
      query: compact({
        limit: input.limit,
        after: input.after,
        before: input.before,
        state: input.state,
        period: input.period,
        from: input.from,
        until: input.until,
        direction: input.direction,
        attendance: input.attendance,
        link: input.link,
      }) as Record<string, string>,
    });
  },
};

export default eventList;
