import { afterEach, test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newEvent from "../../triggers/new-event.ts";
import eventUpdated from "../../triggers/event-updated.ts";
import eventCancelled from "../../triggers/event-cancelled.ts";
import eventStarted from "../../triggers/event-started.ts";
import eventEnded from "../../triggers/event-ended.ts";
import newCalendar from "../../triggers/new-calendar.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

type Ctx = ReturnType<typeof mockCtx>["ctx"];
const params = { calendarId: "primary" };
const run = (
  t: { poll?: (i: never, c: Ctx) => unknown },
  state: unknown,
  ctx: Ctx,
  p: Record<string, unknown> = params,
) =>
  t.poll!({ params: p, state, subscriptionId: "sub_cal" } as never, ctx) as Promise<
    { events: Array<Record<string, unknown>>; nextState: Record<string, unknown> }
  >;
const req = (call: { method: string; url: string }) => {
  const u = new URL(call.url);
  return { method: call.method, path: u.pathname, query: Object.fromEntries(u.searchParams) };
};

test("every new calendar trigger declares poll, output, sample and no onSubscribe", () => {
  for (
    const t of [newEvent, eventUpdated, eventCancelled, eventStarted, eventEnded, newCalendar]
  ) {
    assertEquals(typeof t.poll, "function");
    assertEquals("onSubscribe" in t, false);
    assert(Array.isArray(t.output) && t.output.length > 0, t.key);
    assert(t.sample !== undefined, t.key);
  }
});

// ------------------------------------------------------------ sync feed: created / updated / cancelled

const created = {
  id: "n1",
  status: "confirmed",
  created: "2026-11-09T10:00:00.000Z",
  updated: "2026-11-09T10:00:00.100Z",
};
const edited = {
  id: "u1",
  status: "confirmed",
  created: "2026-11-01T09:00:00.000Z",
  updated: "2026-11-09T12:00:00.000Z",
};
const gone = { id: "g1", status: "cancelled" };
const FEED = [
  [newEvent, "created", created],
  [eventUpdated, "updated", edited],
  [eventCancelled, "cancelled", gone],
] as const;
const feedState = { v: 1, kind: "token", seeded: true, token: "SYNC1" };

for (const [t, kind, own] of FEED) {
  test(`${t.key}: seed walks the full listing, stores the sync token, emits nothing`, async () => {
    const { ctx, calls } = mockCtx([
      { body: { items: [{ id: "a" }], nextPageToken: "pg2" } },
      { body: { items: [{ id: "b" }], nextSyncToken: "SYNC1" } },
    ]);
    const r = await run(t, {}, ctx);
    assertEquals(r.events, []);
    assertEquals(r.nextState, { v: 1, kind: "token", seeded: true, token: "SYNC1" });
    assertEquals(req(calls[0]), {
      method: "GET",
      path: "/calendar/v3/calendars/primary/events",
      query: { maxResults: "250", singleEvents: "true" },
    });
  });

  test(`${t.key}: emits only ${kind} events from a mixed changes page`, async () => {
    const { ctx, calls } = mockCtx([
      { body: { items: [created, edited, gone], nextSyncToken: "SYNC2" } },
    ]);
    const r = await run(t, feedState, ctx);
    assertEquals(r.events, [{ ...own, changeType: kind }]);
    assertEquals((r.nextState as { token?: string }).token, "SYNC2");
    assertEquals(req(calls[0]), {
      method: "GET",
      path: "/calendar/v3/calendars/primary/events",
      query: { syncToken: "SYNC1", maxResults: "100", singleEvents: "true" },
    });
  });

  test(`${t.key}: the same state and responses twice give deep-equal results`, async () => {
    const once = () =>
      run(
        t,
        feedState,
        mockCtx([{ body: { items: [created, edited, gone], nextSyncToken: "S2" } }]).ctx,
      );
    assertEquals(await once(), await once());
  });

  test(`${t.key}: 410 GONE reseeds without emitting or throwing`, async () => {
    const { ctx } = mockCtx([
      { status: 410, body: { error: { code: 410, message: "Gone" } } },
      { body: { items: [], nextSyncToken: "FRESH" } },
    ]);
    const r = await run(t, feedState, ctx);
    assertEquals(r.events, []);
    assertEquals((r.nextState as { token?: string }).token, "FRESH");
  });
}

// ------------------------------------------------------------ time window: started / ended

const T0 = Date.parse("2026-11-10T10:00:00.400Z"); // seed → cursor 10:00:00Z
const T1 = Date.parse("2026-11-10T10:05:00.400Z"); // window [10:00:00Z, 10:05:00Z)
const ev = (id: string, start: string, end: string, extra: Record<string, unknown> = {}) => ({
  id,
  status: "confirmed",
  start: { dateTime: start },
  end: { dateTime: end },
  ...extra,
});

test("event-started: seed stores whole-second cursor and makes no request", async () => {
  clock.now = () => T0;
  const { ctx, calls } = mockCtx([]);
  const r = await run(eventStarted, {}, ctx);
  assertEquals(r.events, []);
  assertEquals(r.nextState, {
    v: 1,
    kind: "window",
    seeded: true,
    cursor: Date.parse("2026-11-10T10:00:00Z"),
  });
  assertEquals(calls.length, 0);
});

test("event-started: window request is literal and only events starting inside it are emitted", async () => {
  clock.now = () => T1;
  const state = { v: 1, kind: "window", seeded: true, cursor: Date.parse("2026-11-10T10:00:00Z") };
  const inside = ev("in", "2026-11-10T10:02:00Z", "2026-11-10T11:00:00Z");
  const early = ev("early", "2026-11-10T09:00:00Z", "2026-11-10T10:30:00Z"); // started before the window
  const { ctx, calls } = mockCtx([{ body: { items: [early, inside] } }]);
  const r = await run(eventStarted, state, ctx);
  assertEquals(r.events, [inside]);
  assertEquals(r.nextState, {
    v: 1,
    kind: "window",
    seeded: true,
    cursor: Date.parse("2026-11-10T10:05:00Z"),
  });
  assertEquals(req(calls[0]), {
    method: "GET",
    path: "/calendar/v3/calendars/primary/events",
    query: {
      timeMin: "2026-11-10T10:00:00Z",
      timeMax: "2026-11-10T10:05:00Z",
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100",
    },
  });
});

test("event-started: the same state and responses twice give deep-equal results", async () => {
  clock.now = () => T1;
  const state = { v: 1, kind: "window", seeded: true, cursor: Date.parse("2026-11-10T10:00:00Z") };
  const page = { body: { items: [ev("in", "2026-11-10T10:02:00Z", "2026-11-10T11:00:00Z")] } };
  assertEquals(
    await run(eventStarted, state, mockCtx([page]).ctx),
    await run(eventStarted, state, mockCtx([page]).ctx),
  );
});

test("event-ended: requests end > cursor - 1s and emits only events ending inside the window", async () => {
  clock.now = () => T1;
  const state = { v: 1, kind: "window", seeded: true, cursor: Date.parse("2026-11-10T10:00:00Z") };
  const ended = ev("done", "2026-11-10T09:00:00Z", "2026-11-10T10:03:00Z");
  const running = ev("run", "2026-11-10T10:01:00Z", "2026-11-10T12:00:00Z");
  const cancelled = ev("x", "2026-11-10T09:00:00Z", "2026-11-10T10:03:00Z", {
    status: "cancelled",
  });
  const { ctx, calls } = mockCtx([{ body: { items: [ended, running, cancelled] } }]);
  const r = await run(eventEnded, state, ctx);
  assertEquals(r.events, [ended]);
  assertEquals(req(calls[0]).query, {
    timeMin: "2026-11-10T09:59:59Z",
    timeMax: "2026-11-10T10:05:00Z",
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });
});

test("event-ended: an all-day event ends at UTC midnight of its end date", async () => {
  clock.now = () => T1;
  const state = { v: 1, kind: "window", seeded: true, cursor: Date.parse("2026-11-09T23:59:00Z") };
  const day = {
    id: "d",
    status: "confirmed",
    start: { date: "2026-11-09" },
    end: { date: "2026-11-10" },
  };
  const r = await run(eventEnded, state, mockCtx([{ body: { items: [day] } }]).ctx);
  assertEquals(r.events, [day]);
});

test("event-started: a window of maxPages + 1 full pages is drained across checks, none twice", async () => {
  clock.now = () => T1;
  const cursor = Date.parse("2026-11-10T10:00:00Z");
  const mk = (n: number) =>
    ev(`e${n}`, `2026-11-10T10:0${1 + (n % 4)}:00Z`, "2026-11-10T11:00:00Z");
  const first = await run(
    eventStarted,
    { v: 1, kind: "window", seeded: true, cursor },
    mockCtx([
      { body: { items: [mk(0)], nextPageToken: "p2" } },
      { body: { items: [mk(1)], nextPageToken: "p3" } },
      { body: { items: [mk(2)], nextPageToken: "p4" } },
    ]).ctx,
  );
  assertEquals(first.events.map((e) => e.id), ["e0", "e1", "e2"]);
  assertEquals(first.nextState, {
    v: 1,
    kind: "window",
    seeded: true,
    cursor,
    until: Date.parse("2026-11-10T10:05:00Z"),
    pageToken: "p4",
  });
  // A later clock must not move the window end while it is being drained.
  clock.now = () => T1 + 600_000;
  const { ctx, calls } = mockCtx([{ body: { items: [mk(3)] } }]);
  const second = await run(eventStarted, first.nextState, ctx);
  assertEquals(second.events.map((e) => e.id), ["e3"]);
  assertEquals(second.nextState, {
    v: 1,
    kind: "window",
    seeded: true,
    cursor: Date.parse("2026-11-10T10:05:00Z"),
  });
  const q = req(calls[0]).query;
  assertEquals([q.pageToken, q.timeMin, q.timeMax], [
    "p4",
    "2026-11-10T10:00:00Z",
    "2026-11-10T10:05:00Z",
  ]);
});

test("event-started: events that began before the seed are never emitted, however many pages", async () => {
  clock.now = () => T0;
  const seeded = await run(eventStarted, {}, mockCtx([]).ctx);
  clock.now = () => T1;
  const old = (n: number) => ev(`old${n}`, "2026-11-10T08:00:00Z", "2026-11-10T18:00:00Z");
  const pages = [1, 2, 3].map((p) => ({
    body: { items: [old(p)], nextPageToken: `p${p + 1}` },
  }));
  const r1 = await run(eventStarted, seeded.nextState, mockCtx(pages).ctx);
  assertEquals(r1.events, []);
  const r2 = await run(eventStarted, r1.nextState, mockCtx([{ body: { items: [old(9)] } }]).ctx);
  assertEquals(r2.events, []);
  clock.now = () => T1 + 300_000;
  const fresh = ev("fresh", "2026-11-10T10:07:00Z", "2026-11-10T11:00:00Z");
  const r3 = await run(eventStarted, r2.nextState, mockCtx([{ body: { items: [fresh] } }]).ctx);
  assertEquals(r3.events, [fresh]);
});

// ------------------------------------------------------------ new calendar

const cal = (id: string) => ({ id, summary: id, accessRole: "owner" });

test("new-calendar: seed emits nothing and requests the calendar list", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [cal("a"), cal("b")] } }]);
  const r = await run(newCalendar, {}, ctx, {});
  assertEquals(r.events, []);
  assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(req(calls[0]), {
    method: "GET",
    path: "/calendar/v3/users/me/calendarList",
    query: { maxResults: "250" },
  });
});

test("new-calendar: emits exactly the calendar added since the seed, across pages", async () => {
  const seeded = await run(newCalendar, {}, mockCtx([{ body: { items: [cal("a")] } }]).ctx, {});
  const pages = () =>
    mockCtx([
      { body: { items: [cal("a")], nextPageToken: "n2" } },
      { body: { items: [cal("b")] } },
    ]);
  const first = pages();
  const r = await run(newCalendar, seeded.nextState, first.ctx, {});
  assertEquals(r.events, [cal("b")]);
  assertEquals(req(first.calls[1]).query, { maxResults: "250", pageToken: "n2" });
  assertEquals(await run(newCalendar, seeded.nextState, pages().ctx, {}), r);
});

test("new-calendar: a renamed or recolored calendar is not new and a removed one is not reported", async () => {
  const seeded = await run(
    newCalendar,
    {},
    mockCtx([{ body: { items: [cal("a"), cal("b")] } }]).ctx,
    {},
  );
  const r = await run(
    newCalendar,
    seeded.nextState,
    mockCtx([{ body: { items: [{ ...cal("a"), summary: "Renamed" }] } }]).ctx,
    {},
  );
  assertEquals(r.events, []);
});
