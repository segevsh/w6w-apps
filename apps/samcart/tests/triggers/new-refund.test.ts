import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import trigger from "../../triggers/new-refund.ts";

const T0 = 1_794_182_400_000; // 2026-11-09T00:00:00Z
const rec = (id: number, created_at = "2026-11-09 00:06:00") => ({ id, created_at });
const body = (items: unknown[]) => ({ data: items, pagination: { next: null, prev: null } });
const poll = (state: unknown, responses: Array<{ body: unknown }>) => {
  const m = mockCtx(responses);
  return trigger.poll!({ params: {}, state, subscriptionId: "s" }, m.ctx).then((r) => ({
    r,
    calls: m.calls,
  }));
};
const ids = (r: { events: unknown[] }) => r.events.map((e) => (e as { id: number }).id);
const REFUNDS = "https://api.samcart.com/v1/refunds";

test("new-refund declares output and sample and is a poll trigger", () => {
  assertEquals(trigger.output!.length > 0, true);
  assertEquals(trigger.sample !== undefined, true);
  assertEquals((trigger as { onSubscribe?: unknown }).onSubscribe, undefined);
});

test("new-refund seeds from the newest refund id with no events, and requests the literal page", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, [{ body: body([rec(41, "2026-11-01 10:00:00")]) }]);
  assertEquals(seeded.r.events, []);
  assertEquals(seeded.calls[0].method, "GET");
  assertEquals(seeded.calls[0].url, `${REFUNDS}?offset=2147483647&limit=1&dir=prev`);
  assertEquals(seeded.r.nextState, { lastId: 41, floor: T0 });
});

test("new-refund emits only refunds after the saved id, retries identically, advances the id", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, [{ body: body([rec(41, "2026-11-01 10:00:00")]) }]);
  clock.now = () => T0 + 300_000;
  const response = { body: body([rec(42), rec(43)]) };
  const first = await poll(seeded.r.nextState, [response]);
  const retry = await poll(seeded.r.nextState, [response]);
  assertEquals(ids(first.r), [42, 43]);
  assertEquals(retry.r, first.r);
  assertEquals(first.calls[0].url, `${REFUNDS}?offset=41&limit=100`);
  assertEquals(first.r.nextState, { lastId: 43, floor: T0 });
  const next = await poll(first.r.nextState, [{ body: body([]) }]);
  assertEquals(next.r.events, []);
  assertEquals(next.calls[0].url, `${REFUNDS}?offset=43&limit=100`);
});

test("new-refund never emits a refund older than the seed even if the seed read missed the newest", async () => {
  clock.now = () => T0;
  // The seed read returned an early refund (id 5): later pages walk old ids, all dropped by the floor.
  const seeded = await poll({}, [{ body: body([rec(5, "2026-01-01 10:00:00")]) }]);
  clock.now = () => T0 + 300_000;
  const c1 = await poll(seeded.r.nextState, [
    { body: body([rec(6, "2026-01-02 10:00:00"), rec(7, "2026-01-03 10:00:00")]) },
  ]);
  assertEquals(c1.r.events, []);
  assertEquals((c1.r.nextState as { lastId: number }).lastId, 7);
  const fresh = rec(8, "2026-11-09 00:06:00");
  const c2 = await poll(c1.r.nextState, [{ body: body([fresh]) }]);
  assertEquals(c2.r.events, [fresh]);
});

test("new-refund with no refunds at seed starts from the first page", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, [{ body: body([]) }]);
  assertEquals(seeded.r.nextState, { lastId: 0, floor: T0 });
  const next = await poll(seeded.r.nextState, [{ body: body([rec(1)]) }]);
  assertEquals(next.calls[0].url, `${REFUNDS}?limit=100`);
  assertEquals(ids(next.r), [1]);
});
