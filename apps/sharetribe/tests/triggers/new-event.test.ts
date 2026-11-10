import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-event.ts";
import { clock } from "../../lib/triggers.ts";

const T0 = Date.parse("2026-11-09T12:00:00.000Z");
const input = { params: {}, subscriptionId: "sub-1" };
const ev = (sequenceId: number) => ({
  id: `e${sequenceId}`,
  type: "event",
  attributes: { sequenceId, eventType: "listing/created" },
});
const page = (data: unknown[]) => ({ body: { data } });
const next = (r: unknown) => (r as { nextState: { token: string } }).nextState;
const events = (r: unknown) => (r as { events: unknown[] }).events;
const seed = async () => {
  clock.now = () => T0;
  const c = mockCtx([]);
  const r = await trigger.poll!({ ...input, state: {} } as never, c.ctx);
  return { r, calls: c.calls };
};

test("new-event: first check records the time as its token, with no request and no events", async () => {
  const { r, calls } = await seed();
  assertEquals(events(r), []);
  assertEquals(next(r), { v: 1, kind: "token", seeded: true, token: "t:2026-11-09T12:00:00.000Z" });
  assertEquals(calls.length, 0);
});

test("new-event: reads from the seed time, emits in order, and moves the token to the last sequence id", async () => {
  const { r: seeded } = await seed();
  const c = mockCtx([page([ev(101), ev(102)])]);
  const first = await trigger.poll!({ ...input, state: seeded.nextState } as never, c.ctx);
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState } as never,
    mockCtx([page([ev(101), ev(102)])]).ctx,
  );
  assertEquals(events(first), [ev(101), ev(102)]);
  assertEquals(next(first).token, `s:102@${T0}`);
  assertEquals(retry, first);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(
    c.calls[0].url,
    "https://flex-integ-api.sharetribe.com/v1/integration_api/events/query?createdAtStart=2026-11-09T12%3A00%3A00.000Z",
  );
});

test("new-event: afterwards reads strictly after the last sequence id, never from the earliest event", async () => {
  const state = { v: 1, kind: "token", seeded: true, token: "s:102" };
  const c = mockCtx([page([ev(103)])]);
  const r = await trigger.poll!({ ...input, state } as never, c.ctx);
  assertEquals(events(r), [ev(103)]);
  assertEquals(next(r).token, "s:103");
  assertEquals(
    c.calls[0].url,
    "https://flex-integ-api.sharetribe.com/v1/integration_api/events/query?startAfterSequenceId=102",
  );
});

test("new-event: an empty check keeps the token", async () => {
  const state = { v: 1, kind: "token", seeded: true, token: "s:102" };
  const r = await trigger.poll!({ ...input, state } as never, mockCtx([page([])]).ctx);
  assertEquals(events(r), []);
  assertEquals(next(r).token, "s:102");
});

test("new-event: more than 1000 events in one response are handed over 1000 at a time", async () => {
  const state = { v: 1, kind: "token", seeded: true, token: "s:0" };
  const many = Array.from({ length: 1200 }, (_, i) => ev(i + 1));
  const r = await trigger.poll!({ ...input, state } as never, mockCtx([page(many)]).ctx);
  assertEquals(events(r).length, 1000);
  assertEquals(next(r).token, "s:1000");
});

test("new-event: an event created before the seed is dropped, the token moves past it, a later event is emitted", async () => {
  const { r: seeded } = await seed();
  const at = (sequenceId: number, createdAt: string) => ({
    id: `e${sequenceId}`,
    type: "event",
    attributes: { sequenceId, createdAt, eventType: "listing/created" },
  });
  const before = Array.from({ length: 1500 }, (_, i) => at(i + 1, "2026-11-09T11:59:30.000Z"));
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState } as never,
    mockCtx([page(before)]).ctx,
  );
  assertEquals(events(first), []);
  assertEquals(next(first).token, `s:1000@${T0}`);
  const second = await trigger.poll!(
    { ...input, state: first.nextState } as never,
    mockCtx([page(before.slice(1000))]).ctx,
  );
  assertEquals(events(second), []);
  assertEquals(next(second).token, `s:1500@${T0}`);
  const after = at(1501, "2026-11-09T12:02:00.000Z");
  const third = await trigger.poll!(
    { ...input, state: second.nextState } as never,
    mockCtx([page([after])]).ctx,
  );
  assertEquals(events(third), [after]);
  assertEquals(next(third).token, `s:1501@${T0}`);
});
