import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-or-updated-form.ts";
const item = (id: number, dateUpdated: string) => ({ id, dateUpdated });
const T0 = 1_794_182_400_000;
const base = "https://api.webconnex.com/v2/public/forms?sort=asc&limit=50";
const poll = async (state: unknown, body: unknown) => {
  const m = mockCtx([{ body }]);
  const r = await trigger.poll!({ params: {}, state, subscriptionId: "s" }, m.ctx);
  return { r, calls: m.calls };
};
const cur = (s: unknown) => (s as { cursor?: string }).cursor;
const keys = (r: { events: unknown[] }) =>
  r.events.map((e) => `${(e as { id: number }).id}:${(e as { dateUpdated: string }).dateUpdated}`);

test("new-or-updated-form seeds, emits edited keys, retries, and requests the literal updated-since page", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, { data: [item(1, "a")] });
  assertEquals(seeded.r.events, []);
  assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seeded.calls[0].method, "GET");
  assertEquals(seeded.calls[0].url, `${base}&dateUpdatedAfter=2026-11-08T23%3A58%3A00Z`);
  const body = { data: [item(1, "b"), item(2, "a")] };
  const first = await poll(seeded.r.nextState, body);
  const retry = await poll(seeded.r.nextState, body);
  assertEquals(keys(first.r), ["1:b", "2:a"]);
  assertEquals(retry.r, first.r);
});

test("new-or-updated-form re-reads the cursor minus the overlap and dedupes the overlap rows", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, { data: [item(1, "a")] });
  assertEquals(cur(seeded.r.nextState), "2026-11-09T00:00:00.000Z");
  clock.now = () => T0 + 300_000;
  const next = await poll(seeded.r.nextState, { data: [item(1, "a")] });
  assertEquals(next.calls[0].url, `${base}&dateUpdatedAfter=2026-11-08T23%3A58%3A00Z`);
  assertEquals(next.r.events, []);
  assertEquals(cur(next.r.nextState), "2026-11-09T00:05:00.000Z");
});

test("new-or-updated-form drains a window of more pages than one check reads, each edit once", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, { data: [] });
  clock.now = () => T0 + 300_000;
  const c1 = await poll(seeded.r.nextState, {
    data: [item(1, "x"), item(2, "x")],
    hasMore: true,
    startingAfter: 2,
  });
  clock.now = () => T0 + 600_000;
  const c2 = await poll(c1.r.nextState, {
    data: [item(3, "x"), item(4, "x")],
    hasMore: true,
    startingAfter: 4,
  });
  clock.now = () => T0 + 900_000;
  const c3 = await poll(c2.r.nextState, { data: [item(5, "x")], hasMore: false });
  assertEquals(keys(c1.r), ["1:x", "2:x"]);
  assertEquals(keys(c2.r), ["3:x", "4:x"]);
  assertEquals(keys(c3.r), ["5:x"]);
  const win = "dateUpdatedAfter=2026-11-08T23%3A58%3A00Z";
  assertEquals(c1.calls[0].url, `${base}&${win}`);
  assertEquals(c2.calls[0].url, `${base}&startingAfter=2&${win}`);
  assertEquals(c3.calls[0].url, `${base}&startingAfter=4&${win}`);
  assertEquals(cur(c1.r.nextState), cur(seeded.r.nextState));
  assertEquals(cur(c2.r.nextState), cur(seeded.r.nextState));
  assertEquals(cur(c3.r.nextState), "2026-11-09T00:05:00.000Z");
  assertEquals((c3.r.nextState as { resume?: unknown }).resume, undefined);
});

test("new-or-updated-form never emits a form updated before the seed, however many pages the window holds", async () => {
  const old = (id: number) => item(id, "2026-11-08T23:59:00Z");
  clock.now = () => T0;
  const seeded = await poll({}, { data: [old(1)] });
  assertEquals(seeded.r.events, []);
  clock.now = () => T0 + 300_000;
  const c1 = await poll(seeded.r.nextState, {
    data: [old(2), old(3)],
    hasMore: true,
    startingAfter: 3,
  });
  clock.now = () => T0 + 600_000;
  const c2 = await poll(c1.r.nextState, {
    data: [old(4), old(5)],
    hasMore: true,
    startingAfter: 5,
  });
  assertEquals(c1.r.events, []);
  assertEquals(c2.r.events, []);
  clock.now = () => T0 + 900_000;
  const c3 = await poll(c2.r.nextState, {
    data: [old(6), item(99, "2026-11-09T00:06:00Z")],
    hasMore: false,
  });
  assertEquals(keys(c3.r), ["99:2026-11-09T00:06:00Z"]);
});
