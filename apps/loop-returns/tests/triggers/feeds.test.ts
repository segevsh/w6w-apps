import { afterEach, describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newCustomer from "../../triggers/new-customer.ts";
import newBulkOperation from "../../triggers/new-bulk-operation.ts";
import newReturn from "../../triggers/new-return.ts";
import newOrUpdatedReturn from "../../triggers/new-or-updated-return.ts";
import newLabelRequest from "../../triggers/new-label-request.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});
const at = (iso: string) => {
  clock.now = () => Date.parse(iso);
};
const idOf = (e: unknown) => String((e as { id: string }).id);

describe("cursor lists, newest first (sort_order=desc)", () => {
  const cases = [
    {
      trigger: newCustomer,
      url: "https://api.loopreturns.com/api/v1/customers?limit=100&sort_order=desc",
      wrap: (items: unknown[]) => ({ body: { customers: items, next_page_url: null } }),
    },
    {
      trigger: newBulkOperation,
      url: "https://api.loopreturns.com/api/v1/bulk-operations?limit=100&sort_order=desc",
      wrap: (items: unknown[]) => ({ body: { bulk_operations: items, next_page_url: null } }),
    },
  ];
  for (const c of cases) {
    test(`${c.trigger.key}: seeds, requests the literal page, emits only the new record, retries`, async () => {
      const seed = mockCtx([c.wrap([{ id: 1 }])]);
      const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, c.url);
      const responses = [c.wrap([{ id: 2 }, { id: 1 }])];
      const first = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx(responses).ctx,
      );
      const retry = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx(responses).ctx,
      );
      assertEquals(first.events, [{ id: 2 }]);
      assertEquals(retry, first);
    });
  }
});

const ret = (id: string, created: string, updated = created) => ({
  id,
  created_at: created,
  updated_at: updated,
});
const retPage = (items: unknown[], next?: string) => ({
  body: {
    returns: items,
    nextPageUrl: next
      ? `https://api.loopreturns.com/api/v1/warehouse/return/list?cursor=${next}`
      : null,
    previousPageUrl: null,
  },
});
const fullRetPage = (n: number, iso: string, more: boolean) =>
  retPage(
    Array.from({ length: 100 }, (_, i) => ret(`p${n}-${i}`, iso)),
    more ? `c${n}` : undefined,
  );

describe("new-return (since-filter on created_at)", () => {
  const url = "https://api.loopreturns.com/api/v1/warehouse/return/list?" +
    "from=2026-11-10+10%3A58%3A00&to=2026-11-10+12%3A00%3A00&filter=created_at&paginate=true&pageSize=100";
  const state = {
    v: 1,
    kind: "ids",
    seeded: true,
    ids: [],
    cursor: Date.parse("2026-11-10T11:00:00Z"),
    floor: Date.parse("2026-11-10T11:00:00Z"),
  };

  test("seed reads nothing and emits nothing", async () => {
    at("2026-11-10T11:00:00Z");
    const seed = mockCtx([]);
    const out = await newReturn.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(out.events, []);
    assertEquals((out.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 0);
  });

  test("requests the literal window, emits the new return, retry is identical", async () => {
    at("2026-11-10T12:00:00Z");
    const fresh = ret("r2", "2026-11-10T11:30:00+00:00");
    const old = ret("r1", "2026-11-10T10:59:00+00:00"); // before the seed floor: dropped
    const c = mockCtx([retPage([fresh, old])]);
    const first = await newReturn.poll!({ ...input, state }, c.ctx);
    const retry = await newReturn.poll!(
      { ...input, state },
      mockCtx([retPage([fresh, old])]).ctx,
    );
    assertEquals(c.calls.length, 1);
    assertEquals(c.calls[0].method, "GET");
    assertEquals(c.calls[0].url, url);
    assertEquals(first.events, [fresh]);
    assertEquals(retry, first);
  });

  test("9.9: records that existed at the seed are never emitted, however many pages the window holds", async () => {
    at("2026-11-10T11:00:00Z");
    const seeded = await newReturn.poll!({ ...input, state: {} }, mockCtx([]).ctx);
    at("2026-11-10T11:05:00Z");
    const r1 = await newReturn.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([1, 2, 3, 4, 5].map((k) => fullRetPage(k, "2026-11-10T10:59:00+00:00", true))).ctx,
    );
    assertEquals(r1.events, []);
    const r2 = await newReturn.poll!(
      { ...input, state: r1.nextState },
      mockCtx([retPage([ret("tail", "2026-11-10T10:59:30+00:00")])]).ctx,
    );
    assertEquals(r2.events, []);
    at("2026-11-10T11:10:00Z");
    const fresh = ret("fresh", "2026-11-10T11:06:00+00:00");
    const r3 = await newReturn.poll!(
      { ...input, state: r2.nextState },
      mockCtx([retPage([fresh])]).ctx,
    );
    assertEquals(r3.events, [fresh]);
  });

  test("9.8: a window of 5+1 full pages is emitted once across two checks, then the cursor advances", async () => {
    const start = Date.parse("2026-11-10T11:00:00Z");
    const s = { v: 1, kind: "ids", seeded: true, ids: ["old"], cursor: start, floor: start };
    const seen: string[] = [];
    at("2026-11-10T11:30:00Z");
    const c1 = mockCtx(
      [1, 2, 3, 4, 5].map((k) => fullRetPage(k, "2026-11-10T11:10:00+00:00", true)),
    );
    const r1 = await newReturn.poll!({ ...input, state: s }, c1.ctx);
    assertEquals(c1.calls.length, 5);
    assertEquals(
      c1.calls[1].url,
      url.replace("2026-11-10+12%3A00%3A00", "2026-11-10+11%3A30%3A00") + "&cursor=c1",
    );
    seen.push(...r1.events.map(idOf));
    const mid = r1.nextState as { cursor?: number; resume?: { pos?: unknown } };
    assertEquals(mid.resume?.pos, "c5");
    assertEquals(mid.cursor, start);
    at("2026-11-10T11:35:00Z");
    const c2 = mockCtx([
      retPage(Array.from({ length: 50 }, (_, i) => ret(`z${i}`, "2026-11-10T11:12:00+00:00"))),
    ]);
    const r2 = await newReturn.poll!({ ...input, state: r1.nextState }, c2.ctx);
    assertEquals(c2.calls.length, 1);
    seen.push(...r2.events.map(idOf));
    const next = r2.nextState as { cursor?: number; resume?: unknown };
    assertEquals(next.cursor, Date.parse("2026-11-10T11:30:00Z"));
    assertEquals(next.resume, undefined);
    assertEquals(seen.length, 550);
    assertEquals(new Set(seen).size, 550);
  });

  test("a cursor older than Loop's 120-day range limit is clamped, not refused forever", async () => {
    at("2026-11-10T12:00:00Z");
    const old = { ...state, cursor: Date.parse("2026-01-01T00:00:00Z"), floor: 0 };
    const c = mockCtx([retPage([])]);
    await newReturn.poll!({ ...input, state: old }, c.ctx);
    assertEquals(
      c.calls[0].url.includes("from=2026-07-14+12%3A00%3A00&to=2026-11-10+12%3A00%3A00"),
      true,
    );
  });
});

describe("new-or-updated-return (since-filter on updated_at)", () => {
  const state = {
    v: 1,
    kind: "ids",
    seeded: true,
    ids: [],
    cursor: Date.parse("2026-11-10T11:00:00Z"),
    floor: Date.parse("2026-11-10T11:00:00Z"),
  };

  test("requests filter=updated_at and re-emits an edited old return", async () => {
    at("2026-11-10T12:00:00Z");
    const edited = ret("r1", "2026-11-01T09:00:00+00:00", "2026-11-10T11:40:00+00:00");
    const c1 = mockCtx([retPage([edited])]);
    const first = await newOrUpdatedReturn.poll!({ ...input, state }, c1.ctx);
    assertEquals(
      c1.calls[0].url,
      "https://api.loopreturns.com/api/v1/warehouse/return/list?from=2026-11-10+10%3A58%3A00" +
        "&to=2026-11-10+12%3A00%3A00&filter=updated_at&paginate=true&pageSize=100",
    );
    assertEquals(first.events, [edited]);
    // The same stamp again is not a new event; a newer edit is.
    at("2026-11-10T12:05:00Z");
    const again = await newOrUpdatedReturn.poll!(
      { ...input, state: first.nextState },
      mockCtx([retPage([edited])]).ctx,
    );
    assertEquals(again.events, []);
    const reedited = ret("r1", "2026-11-01T09:00:00+00:00", "2026-11-10T12:04:00+00:00");
    const third = await newOrUpdatedReturn.poll!(
      { ...input, state: again.nextState },
      mockCtx([retPage([reedited, edited])]).ctx,
    );
    assertEquals(third.events, [reedited]);
  });

  test("9.9: a return updated before the seed is not emitted", async () => {
    at("2026-11-10T12:00:00Z");
    const stale = ret("r9", "2026-10-01T09:00:00+00:00", "2026-11-10T10:59:30+00:00");
    const out = await newOrUpdatedReturn.poll!(
      { ...input, state },
      mockCtx([retPage([stale])]).ctx,
    );
    assertEquals(out.events, []);
  });
});

describe("new-label-request (since-filter on created_at, offset paging)", () => {
  const start = Date.parse("2026-11-10T11:00:00Z");
  const state = { v: 1, kind: "ids", seeded: true, ids: [], cursor: start, floor: start };
  const lr = (id: string, iso: string) => ({ id, created_at: iso });
  const page = (items: unknown[]) => ({ body: { data: items } });
  const fullPage = (n: number, iso: string) =>
    page(Array.from({ length: 100 }, (_, i) => lr(`p${n}-${i}`, iso)));

  test("seed reads nothing and emits nothing", async () => {
    at("2026-11-10T11:00:00Z");
    const seed = mockCtx([]);
    const out = await newLabelRequest.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(out.events, []);
    assertEquals(seed.calls.length, 0);
  });

  test("requests the literal window and emits the new request; retry is identical", async () => {
    at("2026-11-10T12:00:00Z");
    const fresh = lr("9002", "2026-11-10T11:30:00+00:00");
    const c = mockCtx([page([fresh, lr("9001", "2026-11-10T10:59:00+00:00")])]);
    const first = await newLabelRequest.poll!({ ...input, state }, c.ctx);
    const retry = await newLabelRequest.poll!(
      { ...input, state },
      mockCtx([page([fresh, lr("9001", "2026-11-10T10:59:00+00:00")])]).ctx,
    );
    assertEquals(c.calls[0].method, "GET");
    assertEquals(
      c.calls[0].url,
      "https://api.loopreturns.com/api/v1/label-requests?from=2026-11-10T10%3A58%3A00.000Z" +
        "&to=2026-11-10T12%3A00%3A00.000Z&limit=100&offset=0",
    );
    assertEquals(first.events, [fresh]);
    assertEquals(retry, first);
  });

  test("9.9: pre-seed records are never emitted; a later one is", async () => {
    at("2026-11-10T11:05:00Z");
    const r1 = await newLabelRequest.poll!(
      { ...input, state },
      mockCtx([1, 2, 3, 4, 5].map((k) => fullPage(k, "2026-11-10T10:59:00+00:00"))).ctx,
    );
    assertEquals(r1.events, []);
    const r2 = await newLabelRequest.poll!(
      { ...input, state: r1.nextState },
      mockCtx([page([lr("tail", "2026-11-10T10:59:30+00:00")])]).ctx,
    );
    assertEquals(r2.events, []);
    at("2026-11-10T11:10:00Z");
    const fresh = lr("fresh", "2026-11-10T11:06:00+00:00");
    const r3 = await newLabelRequest.poll!(
      { ...input, state: r2.nextState },
      mockCtx([page([fresh])]).ctx,
    );
    assertEquals(r3.events, [fresh]);
  });

  test("9.8: 5+1 full pages drain across two checks, offsets advance, none twice", async () => {
    const seen: string[] = [];
    at("2026-11-10T11:30:00Z");
    const c1 = mockCtx([1, 2, 3, 4, 5].map((k) => fullPage(k, "2026-11-10T11:10:00+00:00")));
    const r1 = await newLabelRequest.poll!({ ...input, state }, c1.ctx);
    assertEquals(c1.calls.map((c) => new URL(c.url).searchParams.get("offset")), [
      "0",
      "100",
      "200",
      "300",
      "400",
    ]);
    seen.push(...r1.events.map(idOf));
    assertEquals((r1.nextState as { cursor?: number }).cursor, start);
    at("2026-11-10T11:35:00Z");
    const c2 = mockCtx([
      page(Array.from({ length: 20 }, (_, i) => lr(`z${i}`, "2026-11-10T11:12:00+00:00"))),
    ]);
    const r2 = await newLabelRequest.poll!({ ...input, state: r1.nextState }, c2.ctx);
    assertEquals(new URL(c2.calls[0].url).searchParams.get("offset"), "500");
    assertEquals(new URL(c2.calls[0].url).searchParams.get("to"), "2026-11-10T11:30:00.000Z");
    seen.push(...r2.events.map(idOf));
    assertEquals((r2.nextState as { cursor?: number }).cursor, Date.parse("2026-11-10T11:30:00Z"));
    assertEquals(seen.length, 520);
    assertEquals(new Set(seen).size, 520);
  });
});
