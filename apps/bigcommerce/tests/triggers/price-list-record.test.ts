import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, v3Page } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-or-updated-price-list-record.ts";
import priceListRecordList from "../../actions/price-list-record-list.ts";

// Brief 9.9 (seed floor) and 9.8 (a window longer than maxPages is resumed, not re-read forever).
const input = { params: { priceListId: 3 }, subscriptionId: "sub-1" };
const ROOT = "https://api.bigcommerce.com/stores/abc123";
const MAX_PAGES = 5;
const PAGE = 100;
const T0 = Date.UTC(2026, 10, 10, 0, 30, 0);
const OLD = T0 - 24 * 3_600_000;
const iso = (ms: number): string => new Date(ms).toISOString().slice(0, 19) + "Z";
let seq = 0;
const rec = (at: number, variant = ++seq) => ({
  price_list_id: 3,
  variant_id: variant,
  currency: "usd",
  price: 10,
  date_modified: iso(at),
});
const page = (items: unknown[]): MockResponse => ({ body: v3Page(items) });
const full = (at: number, last = false): MockResponse =>
  page(Array.from({ length: last ? 1 : PAGE }, () => rec(at)));
const realNow = clock.now;
const at = (ms: number): void => {
  clock.now = () => ms;
};
const run = async (state: unknown, responses: MockResponse[]) => {
  const m = mockCtx(responses);
  const r = await trigger.poll!({ ...input, state }, m.ctx);
  return { ...r, calls: m.calls };
};
const seed = async () => {
  at(T0);
  const seeded = await run({}, [page([rec(OLD)])]);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { floor?: number }).floor, T0);
  return seeded;
};

test("price-list-record action sends modifiedFrom as date_modified:min", async () => {
  const m = mockCtx([{ body: v3Page([]) }]);
  await priceListRecordList.execute(
    { priceListId: 3, modifiedFrom: "2026-11-10T00:00:00Z" },
    m.ctx,
  );
  assertEquals(
    m.calls[0].url,
    `${ROOT}/v3/pricelists/3/records?date_modified%3Amin=2026-11-10T00%3A00%3A00Z`,
  );
});

test("new-or-updated-price-list-record: seed reads the price list, sends the overlap floor, emits nothing", async () => {
  try {
    const seeded = await seed();
    assertEquals(
      seeded.calls[0].url,
      `${ROOT}/v3/pricelists/3/records?date_modified%3Amin=${
        encodeURIComponent(iso(T0 - 120_000))
      }&limit=100&page=1`,
    );
    at(T0 + 300_000);
    const fresh = rec(T0 + 100_000);
    const edited = { ...rec(OLD, 1), date_modified: iso(T0 + 200_000), price: 12 };
    const r = await run(seeded.nextState, [page([edited, fresh, rec(OLD)])]);
    assertEquals(r.events, [fresh, edited]);
    assertEquals(r.calls[0].url.includes(encodeURIComponent(iso(T0 - 120_000))), true);
    const retry = await run(seeded.nextState, [page([edited, fresh, rec(OLD)])]);
    assertEquals(retry.events, r.events);
  } finally {
    clock.now = realNow;
  }
});

test("new-or-updated-price-list-record: records that predate the seed never fire over more than maxPages pages", async () => {
  try {
    let state = (await seed()).nextState;
    at(T0 + 300_000);
    const r1 = await run(state, Array.from({ length: MAX_PAGES }, () => full(OLD)));
    assertEquals(r1.calls.length, MAX_PAGES);
    assertEquals(r1.events, []);
    state = r1.nextState;
    at(T0 + 600_000);
    const r2 = await run(state, [full(OLD, true)]);
    assertEquals(r2.events, []);
  } finally {
    clock.now = realNow;
  }
});

test("new-or-updated-price-list-record: a window of maxPages + 1 pages drains across checks, each record once", async () => {
  try {
    let state = (await seed()).nextState;
    at(T0 + 300_000);
    const r1 = await run(state, Array.from({ length: MAX_PAGES }, () => full(T0 + 100_000)));
    assertEquals(r1.calls.length, MAX_PAGES);
    assertEquals(r1.events.length, MAX_PAGES * PAGE);
    const n1 = r1.nextState as { cursor?: number; resume?: { pos?: unknown } };
    assertEquals(n1.cursor, T0);
    assertEquals(n1.resume?.pos, MAX_PAGES + 1);
    state = r1.nextState;
    at(T0 + 600_000);
    const r2 = await run(state, [full(T0 + 100_000, true)]);
    assertEquals(r2.calls.length, 1);
    assertEquals(r2.calls[0].url.endsWith(`limit=100&page=${MAX_PAGES + 1}`), true);
    assertEquals(r2.events.length, 1);
    const n2 = r2.nextState as { cursor?: number; resume?: unknown };
    assertEquals(n2.cursor, T0 + 300_000);
    assertEquals(n2.resume, undefined);
    const all = [...r1.events, ...r2.events].map((e) => JSON.stringify(e));
    assertEquals(new Set(all).size, MAX_PAGES * PAGE + 1);
  } finally {
    clock.now = realNow;
  }
});
