import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-order.ts";
const item = (id: number) => ({ id });
const T0 = 1_794_182_400_000;
const page = (ids: number[], nextOffset?: number) => ({
  data: ids.map(item),
  pagination: nextOffset === undefined
    ? { next: null, prev: null }
    : { next: `https://api.samcart.com/v1/orders?offset=${nextOffset}&limit=100`, prev: null },
});
const poll = (state: unknown, responses: Array<{ body: unknown }>) => {
  const m = mockCtx(responses);
  return trigger.poll!({ params: {}, state, subscriptionId: "s" }, m.ctx).then((r) => ({
    r,
    calls: m.calls,
  }));
};
const cur = (s: unknown) => (s as { cursor?: string }).cursor;

test("new-order seeds, emits, retries, and requests the literal created-since page", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, [{ body: page([1]) }]);
  assertEquals(seeded.r.events, []);
  assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seeded.calls[0].method, "GET");
  assertEquals(
    seeded.calls[0].url,
    "https://api.samcart.com/v1/orders?created_at_min=2026-11-08T23%3A58%3A00.000Z&limit=100",
  );
  const response = { body: page([2, 1]) };
  const first = await poll(seeded.r.nextState, [response]);
  const retry = await poll(seeded.r.nextState, [response]);
  assertEquals(first.r.events, [item(2)]);
  assertEquals(retry.r, first.r);
});

test("new-order re-reads the cursor minus the overlap on the second request", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, [{ body: page([1]) }]);
  assertEquals(cur(seeded.r.nextState), "2026-11-09T00:00:00.000Z");
  clock.now = () => T0 + 300_000;
  const next = await poll(seeded.r.nextState, [{ body: page([1]) }]);
  assertEquals(
    next.calls[0].url,
    "https://api.samcart.com/v1/orders?created_at_min=2026-11-08T23%3A58%3A00.000Z&limit=100",
  );
  assertEquals(cur(next.r.nextState), "2026-11-09T00:05:00.000Z");
});

test("new-order drains a window of more pages than one check reads, each order once", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, [{ body: page([1]) }]);
  clock.now = () => T0 + 300_000;
  const c1 = await poll(seeded.r.nextState, [{ body: page([4, 3, 2], 3) }]);
  clock.now = () => T0 + 600_000;
  const c2 = await poll(c1.r.nextState, [{ body: page([7, 6, 5], 6) }]);
  clock.now = () => T0 + 900_000;
  const c3 = await poll(c2.r.nextState, [{ body: page([8]) }]);
  assertEquals(c1.r.events.map((e) => (e as { id: number }).id), [2, 3, 4]);
  assertEquals(c2.r.events.map((e) => (e as { id: number }).id), [5, 6, 7]);
  assertEquals(c3.r.events.map((e) => (e as { id: number }).id), [8]);
  // Resumed requests keep the window start and pass the saved offset.
  const win = "created_at_min=2026-11-08T23%3A58%3A00.000Z";
  assertEquals(c1.calls[0].url, `https://api.samcart.com/v1/orders?${win}&limit=100`);
  assertEquals(c2.calls[0].url, `https://api.samcart.com/v1/orders?${win}&offset=3&limit=100`);
  assertEquals(c3.calls[0].url, `https://api.samcart.com/v1/orders?${win}&offset=6&limit=100`);
  // The cursor stays put while paging, then jumps to the first check of that window.
  assertEquals(cur(c1.r.nextState), cur(seeded.r.nextState));
  assertEquals(cur(c2.r.nextState), cur(seeded.r.nextState));
  assertEquals(cur(c3.r.nextState), "2026-11-09T00:05:00.000Z");
  assertEquals((c3.r.nextState as { resume?: unknown }).resume, undefined);
});

test("new-order never emits an order created before the seed, however many pages the window holds", async () => {
  const old = (id: number) => ({ id, order_date: "2026-11-08T23:59:00Z" });
  const pageOf = (items: unknown[], nextOffset?: number) => ({
    ...page([], nextOffset),
    data: items,
  });
  clock.now = () => T0;
  const seeded = await poll({}, [{ body: pageOf([old(1)]) }]);
  assertEquals(seeded.r.events, []);
  clock.now = () => T0 + 300_000;
  const c1 = await poll(seeded.r.nextState, [{ body: pageOf([old(2), old(3), old(4)], 3) }]);
  clock.now = () => T0 + 600_000;
  const c2 = await poll(c1.r.nextState, [{ body: pageOf([old(5), old(6), old(7)], 6) }]);
  assertEquals(c1.r.events, []);
  assertEquals(c2.r.events, []);
  clock.now = () => T0 + 900_000;
  const fresh = { id: 99, order_date: "2026-11-09T00:06:00Z" };
  const c3 = await poll(c2.r.nextState, [{ body: pageOf([fresh, old(8)]) }]);
  assertEquals(c3.r.events, [fresh]);
});
