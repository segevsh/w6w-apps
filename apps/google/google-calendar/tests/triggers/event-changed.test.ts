import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/event-changed.ts";

const params = { calendarId: "primary" };
const poll = (state: unknown, ctx: ReturnType<typeof mockCtx>["ctx"]) =>
  trigger.poll!({ params, state, subscriptionId: "sub_cal" }, ctx);

const seedPages = [
  { body: { items: [{ id: "a" }], nextPageToken: "pg2" } },
  { body: { items: [{ id: "b" }], nextSyncToken: "SYNC1" } },
];
const changed = {
  id: "e1",
  status: "confirmed",
  summary: "Moved",
  created: "2026-11-01T09:00:00.000Z",
  updated: "2026-11-09T12:00:00.000Z",
};

test("event-changed: seed walks every page, stores the sync token, emits nothing", async () => {
  const { ctx, calls } = mockCtx(seedPages);
  const result = await poll({}, ctx);
  assertEquals(result.events, []);
  assertEquals(result.nextState, { v: 1, kind: "token", seeded: true, token: "SYNC1" });
  const q = (i: number) => Object.fromEntries(new URL(calls[i].url).searchParams);
  assertEquals(q(0), { maxResults: "250", singleEvents: "true" });
  assertEquals(q(1), { maxResults: "250", singleEvents: "true", pageToken: "pg2" });
});

test("event-changed: emits exactly the changed event with changeType", async () => {
  const seeded = await poll({}, mockCtx(seedPages).ctx);
  const result = await poll(
    seeded.nextState,
    mockCtx([{ body: { items: [changed], nextSyncToken: "SYNC2" } }]).ctx,
  );
  assertEquals(result.events, [{ ...changed, changeType: "updated" }]);
  assertEquals((result.nextState as { token: string }).token, "SYNC2");
});

test("event-changed: classifies created and cancelled events", async () => {
  const state = { v: 1, kind: "token", seeded: true, token: "SYNC1" };
  const created = {
    id: "n",
    created: "2026-11-09T10:00:00.000Z",
    updated: "2026-11-09T10:00:00.100Z",
  };
  const gone = { id: "g", status: "cancelled" };
  const result = await poll(
    state,
    mockCtx([{ body: { items: [created, gone], nextSyncToken: "S" } }]).ctx,
  );
  assertEquals(result.events.map((e) => (e as { changeType: string }).changeType), [
    "created",
    "cancelled",
  ]);
});

test("event-changed: same state and responses give deep-equal results", async () => {
  const state = { v: 1, kind: "token", seeded: true, token: "SYNC1" };
  const run = () =>
    poll(state, mockCtx([{ body: { items: [changed], nextSyncToken: "SYNC2" } }]).ctx);
  assertEquals(await run(), await run());
});

test("event-changed: changes request carries syncToken and no forbidden parameter", async () => {
  const state = { v: 1, kind: "token", seeded: true, token: "SYNC1" };
  const { ctx, calls } = mockCtx([{ body: { items: [], nextSyncToken: "SYNC2" } }]);
  await poll(state, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    { method: calls[0].method, path: url.pathname, query: Object.fromEntries(url.searchParams) },
    {
      method: "GET",
      path: "/calendar/v3/calendars/primary/events",
      query: { syncToken: "SYNC1", maxResults: "100", singleEvents: "true" },
    },
  );
});

test("event-changed: a following changes page is continued on the next check", async () => {
  const state = { v: 1, kind: "token", seeded: true, token: "SYNC1" };
  const first = await poll(
    state,
    mockCtx([{ body: { items: [changed], nextPageToken: "P2" } }]).ctx,
  );
  const { ctx, calls } = mockCtx([{ body: { items: [], nextSyncToken: "SYNC3" } }]);
  const second = await poll(first.nextState, ctx);
  const q = Object.fromEntries(new URL(calls[0].url).searchParams);
  assertEquals(q.syncToken, "SYNC1");
  assertEquals(q.pageToken, "P2");
  assertEquals((second.nextState as { token: string }).token, "SYNC3");
});

test("event-changed: 410 GONE reseeds, emits nothing, does not throw", async () => {
  const state = { v: 1, kind: "token", seeded: true, token: "OLD" };
  const result = await poll(
    state,
    mockCtx([
      { status: 410, statusText: "Gone", body: { error: { code: 410 } } },
      { body: { items: [{ id: "x" }], nextSyncToken: "FRESH" } },
    ]).ctx,
  );
  assertEquals(result.events, []);
  assertEquals((result.nextState as { token: string }).token, "FRESH");
});
