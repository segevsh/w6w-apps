import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { linkHeader, mockCtx } from "../_helpers.ts";
import newCustomer from "../../triggers/new-customer.ts";
import newClick from "../../triggers/new-click.ts";
import { clock } from "../../lib/since-poll.ts";

const T0 = Date.parse("2026-11-09T12:00:00.000Z"); // the seed check
const T1 = Date.parse("2026-11-09T12:10:00.000Z"); // the next check
const JSON_H = { "content-type": "application/json" };
const at = (ms: number) => {
  clock.now = () => ms;
};

// Table-driven: the two day-granular since-filter triggers share one case set.
const specs = [
  { name: "new-customer", trigger: newCustomer, path: "/1.6/customers/", prefix: "cu_" },
  { name: "new-click", trigger: newClick, path: "/1.6/clicks/", prefix: "click-" },
];

for (const { name, trigger, path, prefix } of specs) {
  const input = { params: {}, subscriptionId: "sub-1" };
  const row = (n: number, createdAt = "2026-11-09T12:05:00+0000") => ({
    id: `${prefix}${n}`,
    created_at: createdAt,
  });
  const rows = (from: number, to: number, createdAt?: string) =>
    Array.from({ length: to - from + 1 }, (_, i) => row(from + i, createdAt));
  const page = (items: unknown[], next?: number) => ({
    body: items,
    headers: next === undefined ? JSON_H : { ...JSON_H, link: linkHeader(next, path) },
  });
  const ids = (events: unknown[]) => events.map((e) => (e as { id: string }).id).sort();
  const seedState = async () => {
    at(T0);
    const seed = mockCtx([]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 0); // the seed reads nothing
    return seeded.nextState;
  };

  test(`${name} seeds without a request, emits the new row, retries identically`, async () => {
    const state = await seedState();
    at(T1);
    const run = () => trigger.poll!({ ...input, state }, mockCtx([page([row(7)])]).ctx);
    const first = await run();
    const retry = await run();
    assertEquals(ids(first.events), [`${prefix}7`]);
    assertEquals(retry, first);
  });

  test(`${name} requests the literal day-wide window of GET ${path}`, async () => {
    const state = await seedState();
    at(T1);
    const m = mockCtx([page([])]);
    await trigger.poll!({ ...input, state }, m.ctx);
    assertEquals(m.calls.length, 1);
    assertEquals(m.calls[0].method, "GET");
    // One day earlier than the seed and one day later than the check: the vendor filters whole UTC days.
    assertEquals(
      m.calls[0].url,
      `https://api.tapfiliate.com${path}?date_from=2026-11-08&date_to=2026-11-10&page=1`,
    );
  });

  test(`${name} drops rows created before the seed that share the queried days`, async () => {
    const state = await seedState();
    at(T1);
    const res = await trigger.poll!(
      { ...input, state },
      mockCtx([
        page([row(1, "2026-11-08T23:00:00+0000"), row(2, "2026-11-09T11:59:59+0000"), row(3)]),
      ]).ctx,
    );
    assertEquals(ids(res.events), [`${prefix}3`]);
  });

  test(`${name} drains a window of 5 full pages over 2 checks: each row once, cursor after`, async () => {
    const state = await seedState();
    at(T1);
    const pages = Array.from({ length: 5 }, (_, i) => rows(i * 25 + 1, i * 25 + 25));
    const respond = (from: number, to: number) =>
      pages.slice(from, to).map((p, i) => page(p, from + i + 2 <= 5 ? from + i + 2 : undefined));
    const r1 = await trigger.poll!({ ...input, state }, mockCtx(respond(0, 4)).ctx);
    assertEquals(r1.events.length, 100);
    const s1 = r1.nextState as { cursor: number; resume?: { pos: number } };
    assertEquals(s1.cursor, T0); // not advanced: the window is not drained
    assertEquals(s1.resume?.pos, 5);
    at(T1 + 300_000); // the clock moves on; the window bounds must not
    const c2 = mockCtx(respond(4, 5));
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
    assertEquals(ids(r2.events), rows(101, 125).map((r) => r.id).sort());
    assertEquals(
      c2.calls[0].url,
      `https://api.tapfiliate.com${path}?date_from=2026-11-08&date_to=2026-11-10&page=5`,
    );
    const s2 = r2.nextState as { cursor: number; resume?: unknown };
    assertEquals(s2.cursor, T1); // advanced to the window's upper bound once drained
    assertEquals(s2.resume, undefined);
  });

  test(`${name} first-check flood: 5 pages of pre-seed rows emit nothing, then one new row`, async () => {
    const state = await seedState();
    const old = "2026-11-09T09:00:00+0000";
    const queue = Array.from(
      { length: 5 },
      (_, i) => page(rows(i * 25 + 1, i * 25 + 25, old), i < 4 ? i + 2 : undefined),
    );
    at(T1);
    const r1 = await trigger.poll!({ ...input, state }, mockCtx(queue.slice(0, 4)).ctx);
    assertEquals(r1.events, []);
    at(T1 + 300_000);
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, mockCtx([queue[4]]).ctx);
    assertEquals(r2.events, []);
    at(T1 + 600_000);
    const r3 = await trigger.poll!(
      { ...input, state: r2.nextState },
      mockCtx([page([...rows(1, 25, old), row(999, "2026-11-09T12:12:00+0000")])]).ctx,
    );
    assertEquals(ids(r3.events), [`${prefix}999`]);
  });
}
