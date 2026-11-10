import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newCalendar from "../../triggers/new-calendar.ts";
import newCalendarSubscriber from "../../triggers/new-calendar-subscriber.ts";
import newCalendarTemplate from "../../triggers/new-calendar-template.ts";
import newEvent from "../../triggers/new-event.ts";
import newRsvpAttendee from "../../triggers/new-rsvp-attendee.ts";
import newRsvpForm from "../../triggers/new-rsvp-form.ts";
import type { TriggerDefinition } from "@w6w/types";

const BASE = "https://api.addevent.com/calevent/v2";
const SORT = "page=1&page_size=20&sort_by=created&sort_order=desc";

interface Case {
  name: string;
  trigger: TriggerDefinition;
  params: Record<string, unknown>;
  /** Literal URL of the request one check makes. */
  url: string;
  /** Response body for a newest-first page holding the ids. */
  body(ids: string[]): unknown;
}

const rows = (ids: string[]) => ids.map((id) => ({ id, title: `Item ${id}` }));
const wrapped = (field: string) => (ids: string[]) => ({
  pagination: { current_page: 1, next_page: 2 },
  [field]: rows(ids),
});

const cases: Case[] = [
  {
    name: "new-event",
    trigger: newEvent,
    params: {},
    url: `${BASE}/events?${SORT}`,
    body: wrapped("events"),
  },
  {
    name: "new-calendar",
    trigger: newCalendar,
    params: {},
    url: `${BASE}/calendars?${SORT}`,
    body: wrapped("calendars"),
  },
  {
    name: "new-calendar-subscriber",
    trigger: newCalendarSubscriber,
    params: {},
    url: `${BASE}/subscribers?${SORT}`,
    body: wrapped("subscribers"),
  },
  {
    name: "new-rsvp-attendee",
    trigger: newRsvpAttendee,
    params: {},
    url: `${BASE}/rsvps?${SORT}`,
    body: wrapped("rsvps"),
  },
  {
    name: "new-rsvp-form",
    trigger: newRsvpForm,
    params: {},
    url: `${BASE}/events/rsvp-forms`,
    body: rows,
  },
  {
    name: "new-calendar-template (default type)",
    trigger: newCalendarTemplate,
    params: {},
    url: `${BASE}/calendars/templates?type=calendar-landing`,
    body: rows,
  },
  {
    name: "new-calendar-template (embed)",
    trigger: newCalendarTemplate,
    params: { type: "calendar-embed" },
    url: `${BASE}/calendars/templates?type=calendar-embed`,
    body: rows,
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const poll = async (state: unknown, ids: string[]) => {
      const m = mockCtx([{ body: c.body(ids) }]);
      const r = await c.trigger.poll!({ params: c.params, state, subscriptionId: "s" }, m.ctx);
      return { r, calls: m.calls };
    };

    test("seeds without events, then emits only the new record, idempotently", async () => {
      const seeded = await poll({}, ["b", "a"]);
      assertEquals(seeded.r.events, []);
      assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
      const first = await poll(seeded.r.nextState, ["c", "b", "a"]);
      const retry = await poll(seeded.r.nextState, ["c", "b", "a"]);
      assertEquals(first.r.events, [{ id: "c", title: "Item c" }]);
      assertEquals(retry.r, first.r);
    });

    test("sends the literal request of the wrapped list action", async () => {
      const { calls } = await poll({}, ["a"]);
      assertEquals(calls.length, 1);
      assertEquals(calls[0].method, "GET");
      assertEquals(calls[0].url, c.url);
    });
  });
}
