import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-lead.ts";

/** 2026-11-09T00:00:00Z */
const T0 = 1_794_182_400_000;
const BASE = "https://api.yelp.com/v3/businesses/biz-1/lead_ids";
const params = { businessId: "biz-1" };
const page = (ids: string[], hasMore = false) => ({ body: { lead_ids: ids, has_more: hasMore } });
const poll = async (state: unknown, responses: Array<{ body: unknown }>) => {
  const m = mockCtx(responses);
  const r = await trigger.poll!({ params, state, subscriptionId: "s" }, m.ctx);
  return { r, calls: m.calls };
};
const cur = (s: unknown) => (s as { cursor?: string }).cursor;
const leads = (events: unknown[]) => events.map((e) => (e as { lead_id: string }).lead_id);

test("new-lead: seeds, emits only new leads, retries idempotently, literal request", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, [page(["L1"])]);
  assertEquals(seeded.r.events, []);
  assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seeded.calls[0].method, "GET");
  assertEquals(seeded.calls[0].url, `${BASE}?limit=20&created_after=2026-11-09T00%3A00%3A00Z`);
  clock.now = () => T0 + 300_000;
  const response = page(["L2", "L1"]);
  const first = await poll(seeded.r.nextState, [response]);
  const retry = await poll(seeded.r.nextState, [response]);
  assertEquals(first.r.events, [{ lead_id: "L2" }]);
  assertEquals(retry.r, first.r);
  // Window start: cursor (00:00:00) minus the 2 min overlap is before the seed, so it is clamped.
  assertEquals(first.calls[0].url, `${BASE}?limit=20&created_after=2026-11-09T00%3A00%3A00Z`);
});

test("new-lead: re-reads the cursor minus the overlap once past the seed time", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, [page([])]);
  clock.now = () => T0 + 300_000;
  const c1 = await poll(seeded.r.nextState, [page([])]);
  assertEquals(cur(c1.r.nextState), "2026-11-09T00:05:00.000Z");
  clock.now = () => T0 + 600_000;
  const c2 = await poll(c1.r.nextState, [page([])]);
  assertEquals(c2.calls[0].url, `${BASE}?limit=20&created_after=2026-11-09T00%3A03%3A00Z`);
});

test("new-lead: drains a window of more pages than one check reads, each lead once", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, [page([])]);
  clock.now = () => T0 + 300_000;
  const c1 = await poll(seeded.r.nextState, [page(["L2", "L3"], true)]);
  clock.now = () => T0 + 600_000;
  const c2 = await poll(c1.r.nextState, [page(["L4", "L5"], true)]);
  clock.now = () => T0 + 900_000;
  const c3 = await poll(c2.r.nextState, [page(["L6"])]);
  assertEquals(leads(c1.r.events).sort(), ["L2", "L3"]);
  assertEquals(leads(c2.r.events).sort(), ["L4", "L5"]);
  assertEquals(leads(c3.r.events), ["L6"]);
  const win = "created_after=2026-11-09T00%3A00%3A00Z";
  assertEquals(c1.calls[0].url, `${BASE}?limit=20&${win}`);
  assertEquals(c2.calls[0].url, `${BASE}?limit=20&after_lead_id=L3&${win}`);
  assertEquals(c3.calls[0].url, `${BASE}?limit=20&after_lead_id=L5&${win}`);
  assertEquals(cur(c1.r.nextState), cur(seeded.r.nextState));
  assertEquals(cur(c2.r.nextState), cur(seeded.r.nextState));
  assertEquals(cur(c3.r.nextState), "2026-11-09T00:05:00.000Z");
  assertEquals((c3.r.nextState as { resume?: unknown }).resume, undefined);
});

test("new-lead: the window never reaches back before the seed, so older leads are never emitted", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, [page(["OLD1"])]);
  assertEquals(seeded.r.events, []);
  // Several checks later the requested window is still bounded below by the seed time.
  clock.now = () => T0 + 60_000;
  const c1 = await poll(seeded.r.nextState, [page([])]);
  assertEquals(c1.calls[0].url, `${BASE}?limit=20&created_after=2026-11-09T00%3A00%3A00Z`);
  assertEquals(c1.r.events, []);
  clock.now = () => T0 + 120_000;
  const c2 = await poll(c1.r.nextState, [page(["NEW1"])]);
  assertEquals(c2.r.events, [{ lead_id: "NEW1" }]);
});
