import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, page } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-contact.ts";
const item = (id: number) => ({ id });
const T0 = 1_794_182_400_000;
const base = "https://api.sendfox.com/contacts?per_page=100";
const since = (iso: string) => `filter%5Bcreated_after%5D=${iso.replaceAll(":", "%3A")}`;
const poll = async (state: unknown, body: unknown) => {
  const m = mockCtx([{ body }]);
  const r = await trigger.poll!({ params: {}, state, subscriptionId: "s" }, m.ctx);
  return { r, calls: m.calls };
};
const cur = (s: unknown) => (s as { cursor?: string }).cursor;
const ids = (r: { events: unknown[] }) => r.events.map((e) => (e as { id: number }).id);

test("new-contact seeds, emits, retries, and requests literal created-since contacts", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, page([item(1)]));
  assertEquals(seeded.r.events, []);
  assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seeded.calls[0].method, "GET");
  assertEquals(seeded.calls[0].url, `${base}&${since("2026-11-08T23:58:00.000Z")}`);
  const first = await poll(seeded.r.nextState, page([item(2), item(1)]));
  const retry = await poll(seeded.r.nextState, page([item(2), item(1)]));
  assertEquals(first.r.events, [item(2)]);
  assertEquals(retry.r, first.r);
});

test("new-contact re-reads the cursor minus the overlap on the second request", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, page([item(1)]));
  assertEquals(cur(seeded.r.nextState), "2026-11-09T00:00:00.000Z");
  clock.now = () => T0 + 300_000;
  const next = await poll(seeded.r.nextState, page([item(1)]));
  assertEquals(next.calls[0].url, `${base}&${since("2026-11-08T23:58:00.000Z")}`);
  assertEquals(cur(next.r.nextState), "2026-11-09T00:05:00.000Z");
});

test("new-contact drains a window of more pages than one check reads, each contact once", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, page([item(1)]));
  clock.now = () => T0 + 300_000;
  const c1 = await poll(seeded.r.nextState, page([item(4), item(3), item(2)], { total: 250 }));
  clock.now = () => T0 + 600_000;
  const c2 = await poll(c1.r.nextState, page([item(7), item(6), item(5)], { total: 250 }));
  clock.now = () => T0 + 900_000;
  const c3 = await poll(c2.r.nextState, page([item(8)], { total: 250 }));
  assertEquals(ids(c1.r), [2, 3, 4]);
  assertEquals(ids(c2.r), [5, 6, 7]);
  assertEquals(ids(c3.r), [8]);
  const win = since("2026-11-08T23:58:00.000Z");
  assertEquals(c1.calls[0].url, `${base}&${win}`);
  assertEquals(c2.calls[0].url, `${base}&page=2&${win}`);
  assertEquals(c3.calls[0].url, `${base}&page=3&${win}`);
  assertEquals(cur(c1.r.nextState), cur(seeded.r.nextState));
  assertEquals(cur(c2.r.nextState), cur(seeded.r.nextState));
  assertEquals(cur(c3.r.nextState), "2026-11-09T00:05:00.000Z");
  assertEquals((c3.r.nextState as { resume?: unknown }).resume, undefined);
});

test("new-contact never emits a contact created before the seed, however many pages the window holds", async () => {
  const old = (id: number) => ({ id, created_at: "2026-11-08T23:59:00Z" });
  const full = (from: number, last_page: number) => ({
    ...page([]),
    data: Array.from({ length: 100 }, (_, i) => old(from + i)),
    total: last_page * 100,
  });
  clock.now = () => T0;
  const seeded = await poll({}, page([old(1)]));
  assertEquals(seeded.r.events, []);
  clock.now = () => T0 + 300_000;
  const c1 = await poll(seeded.r.nextState, full(10, 4));
  clock.now = () => T0 + 600_000;
  const c2 = await poll(c1.r.nextState, full(200, 4));
  assertEquals(c1.r.events, []);
  assertEquals(c2.r.events, []);
  clock.now = () => T0 + 900_000;
  const fresh = { id: 999, created_at: "2026-11-09T00:06:00Z" };
  const c3 = await poll(c2.r.nextState, { ...page([]), data: [fresh, old(500)], total: 400 });
  assertEquals(ids(c3.r), [999]);
});
