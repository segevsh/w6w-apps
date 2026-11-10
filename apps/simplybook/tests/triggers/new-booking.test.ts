import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, TEST_DISPLAY } from "../_helpers.ts";
import trigger, { zonedToMs } from "../../triggers/new-booking.ts";
import { clock } from "../../lib/since-poll.ts";

// Company time zone Europe/Berlin = UTC+1 in November: 13:00 company time is 12:00 UTC.
const ZONE = "Europe/Berlin";
const T0 = Date.parse("2026-11-09T12:00:00.000Z"); // the seed check
const T1 = Date.parse("2026-11-09T12:10:00.000Z"); // the next check
const input = { params: {}, subscriptionId: "sub-1" };
const info = { body: { timezone: ZONE } };
const book = (id: number, recordDate = "2026-11-09 13:05:00") => ({
  id,
  code: `C${id}`,
  record_date: recordDate,
});
const rows = (from: number, to: number, recordDate?: string) =>
  Array.from({ length: to - from + 1 }, (_, i) => book(from + i, recordDate));
const page = (items: unknown[], pagesCount: number, n = 1) => ({
  body: { data: items, metadata: { items_count: 0, pages_count: pagesCount, page: n } },
});
const ctxOf = (responses: unknown[]) => mockCtx(responses as never[], { display: TEST_DISPLAY });
const ids = (events: unknown[]) =>
  events.map((e) => (e as { id: number }).id).sort((a, b) => a - b);
const at = (ms: number) => {
  clock.now = () => ms;
};
const seedState = async () => {
  at(T0);
  const seed = ctxOf([]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 0); // the seed reads nothing
  return seeded.nextState;
};
const BOOKINGS = "https://user-api-v2.simplybook.me/admin/bookings?";
const window = (n: number) =>
  `${BOOKINGS}page=${n}&on_page=100&filter%5Brecord_date_from%5D=2026-11-08` +
  `&filter%5Brecord_date_to%5D=2026-11-10`;

test("zonedToMs reads wall-clock time in the company zone, across a DST change", () => {
  assertEquals(zonedToMs("2026-11-09 13:00:00", ZONE), Date.parse("2026-11-09T12:00:00Z"));
  assertEquals(zonedToMs("2026-07-09 13:00:00", ZONE), Date.parse("2026-07-09T11:00:00Z"));
  assertEquals(zonedToMs("2026-10-25 02:30:00", ZONE) > 0, true);
  assertEquals(zonedToMs("nope", ZONE), NaN);
});

test("new-booking seeds without a request, emits the new row, retries identically", async () => {
  const state = await seedState();
  at(T1);
  const run = () => trigger.poll!({ ...input, state }, ctxOf([info, page([book(7)], 1)]).ctx);
  const first = await run();
  const retry = await run();
  assertEquals(ids(first.events), [7]);
  assertEquals(retry, first);
});

test("new-booking requests the literal day-wide creation window of GET /admin/bookings", async () => {
  const state = await seedState();
  at(T1);
  const m = ctxOf([info, page([], 1)]);
  await trigger.poll!({ ...input, state }, m.ctx);
  assertEquals(m.calls.length, 2);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(m.calls[0].url, "https://user-api-v2.simplybook.me/admin/company/info");
  assertEquals(m.calls[1].method, "GET");
  assertEquals(m.calls[1].url, window(1));
});

test("new-booking compares record_date in the company zone: a pre-seed booking of the same day is dropped", async () => {
  const state = await seedState();
  at(T1);
  const res = await trigger.poll!(
    { ...input, state },
    ctxOf([
      info,
      page([
        book(1, "2026-11-09 12:59:59"), // 11:59:59 UTC: before the seed
        book(2, "2026-11-08 23:00:00"),
        book(3, "2026-11-09 13:05:00"), // 12:05 UTC: after the seed
      ], 1),
    ]).ctx,
  );
  assertEquals(ids(res.events), [3]);
});

test("new-booking drains a window of 3 full pages over 3 checks: each row once, cursor after", async () => {
  const state = await seedState();
  at(T1);
  const r1 = await trigger.poll!(
    { ...input, state },
    ctxOf([info, page(rows(1, 100), 3, 1)]).ctx,
  );
  assertEquals(ids(r1.events), rows(1, 100).map((r) => r.id));
  const s1 = r1.nextState as { cursor: number; resume?: { pos: number } };
  assertEquals(s1.cursor, T0); // not advanced: the window is not drained
  assertEquals(s1.resume?.pos, 2);
  at(T1 + 300_000); // the clock moves on; the window bounds must not
  const c2 = ctxOf([info, page(rows(101, 200), 3, 2)]);
  const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
  assertEquals(ids(r2.events), rows(101, 200).map((r) => r.id));
  assertEquals(c2.calls[1].url, window(2));
  assertEquals((r2.nextState as { resume?: { pos: number } }).resume?.pos, 3);
  at(T1 + 600_000);
  const r3 = await trigger.poll!(
    { ...input, state: r2.nextState },
    ctxOf([info, page(rows(201, 230), 3, 3)]).ctx,
  );
  assertEquals(ids(r3.events), rows(201, 230).map((r) => r.id));
  const s3 = r3.nextState as { cursor: number; resume?: unknown };
  assertEquals(s3.cursor, T1);
  assertEquals(s3.resume, undefined);
  at(T1 + 900_000);
  const r4 = await trigger.poll!(
    { ...input, state: r3.nextState },
    ctxOf([info, page([book(230), book(231, "2026-11-09 13:20:00")], 1)]).ctx,
  );
  assertEquals(ids(r4.events), [231]);
});

test("new-booking first-check flood: 3 pages of pre-seed bookings emit nothing, then one new row", async () => {
  const state = await seedState();
  const old = "2026-11-09 10:00:00";
  let s: unknown = state;
  for (let n = 1; n <= 3; n++) {
    at(T1 + n * 300_000);
    const r = await trigger.poll!(
      { ...input, state: s },
      ctxOf([info, page(rows(n * 100 - 99, n * 100, old), 3, n)]).ctx,
    );
    assertEquals(r.events, []);
    s = r.nextState;
  }
  at(T1 + 2_000_000);
  const r = await trigger.poll!(
    { ...input, state: s },
    ctxOf([info, page([...rows(1, 50, old), book(999, "2026-11-09 13:40:00")], 1)]).ctx,
  );
  assertEquals(ids(r.events), [999]);
});

test("new-booking accepts a bare-array response and pages while a page is full", async () => {
  const state = await seedState();
  at(T1);
  const r1 = await trigger.poll!(
    { ...input, state },
    ctxOf([info, { body: rows(1, 100) }]).ctx,
  );
  assertEquals((r1.nextState as { resume?: { pos: number } }).resume?.pos, 2);
  const r2 = await trigger.poll!(
    { ...input, state: r1.nextState },
    ctxOf([info, { body: rows(101, 103) }]).ctx,
  );
  assertEquals(ids(r2.events), [101, 102, 103]);
  assertEquals((r2.nextState as { resume?: unknown }).resume, undefined);
});

test("new-booking keeps only rows stamped inside the exact window (not before its start, not after its end)", async () => {
  const state = await seedState();
  at(T1);
  const r1 = await trigger.poll!({ ...input, state }, ctxOf([info, page([], 1)]).ctx);
  at(T1 + 600_000); // window = [12:08, 12:20] UTC = [13:08, 13:20] company time
  const r2 = await trigger.poll!(
    { ...input, state: r1.nextState },
    ctxOf([
      info,
      page([
        book(1, "2026-11-09 13:06:00"), // after the seed, before this window
        book(2, "2026-11-09 13:15:00"),
        book(3, "2026-11-09 13:40:00"), // after this window's end
      ], 1),
    ]).ctx,
  );
  assertEquals(ids(r2.events), [2]);
});
