import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-enrollment.ts";
import { clock } from "../../lib/since-poll.ts";

const T0 = Date.parse("2026-11-09T12:00:00.000Z"); // the seed check
const T1 = Date.parse("2026-11-09T12:10:00.000Z"); // the next check
const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: number) => ({ id, user_email: "s@example.com" });
const rows = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => item(from + i));
// Order inside one check is not part of the contract (items carry no creation stamp): sort.
const ids = (events: unknown[]) =>
  events.map((e) => (e as { id: number }).id).sort((a, b) => a - b);
const at = (ms: number) => {
  clock.now = () => ms;
};
const seedState = async () => {
  at(T0);
  const seed = mockCtx([]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 0); // the seed reads nothing
  return seeded.nextState;
};

test("new-enrollment seeds without a request, emits the new row, retries identically", async () => {
  const state = await seedState();
  at(T1);
  const run = () =>
    trigger.poll!({ ...input, state }, mockCtx([{ body: listEnvelope([item(7)]) }]).ctx);
  const first = await run();
  const retry = await run();
  assertEquals(ids(first.events), [7]);
  assertEquals(retry, first);
});

test("new-enrollment requests the literal created_after/created_before window", async () => {
  const state = await seedState();
  at(T1);
  const m = mockCtx([{ body: listEnvelope([]) }]);
  await trigger.poll!({ ...input, state }, m.ctx);
  assertEquals(m.calls[0].method, "GET");
  // The window starts at the seed (never before it) and ends at the check time.
  assertEquals(
    m.calls[0].url,
    "https://api.thinkific.com/api/public/v1/enrollments?page=1&limit=100" +
      "&query%5Bcreated_before%5D=2026-11-09T12%3A10%3A00.000Z" +
      "&query%5Bcreated_after%5D=2026-11-09T12%3A00%3A00.000Z",
  );
});

test("new-enrollment drains a window of 2 full pages across checks: each row once, cursor after", async () => {
  const state = await seedState();
  at(T1);
  const c1 = mockCtx([{ body: listEnvelope(rows(1, 100), { next_page: 2 }) }]);
  const r1 = await trigger.poll!({ ...input, state }, c1.ctx);
  assertEquals(ids(r1.events), rows(1, 100).map((r) => r.id));
  const s1 = r1.nextState as { cursor: number; resume?: { pos: number } };
  assertEquals(s1.cursor, T0); // not advanced: the window is not drained
  assertEquals(s1.resume?.pos, 2);
  at(T1 + 300_000); // the clock moves on; the window bounds must not
  const c2 = mockCtx([{ body: listEnvelope(rows(101, 200)) }]);
  const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
  assertEquals(ids(r2.events), rows(101, 200).map((r) => r.id));
  assertEquals(
    c2.calls[0].url,
    "https://api.thinkific.com/api/public/v1/enrollments?page=2&limit=100" +
      "&query%5Bcreated_before%5D=2026-11-09T12%3A10%3A00.000Z" +
      "&query%5Bcreated_after%5D=2026-11-09T12%3A00%3A00.000Z",
  );
  const s2 = r2.nextState as { cursor: number; resume?: unknown };
  assertEquals(s2.cursor, T1); // advanced to the window's upper bound once drained
  assertEquals(s2.resume, undefined);
  // The next window re-reads the overlap: rows already emitted are not emitted twice.
  at(T1 + 600_000);
  const r3 = await trigger.poll!(
    { ...input, state: r2.nextState },
    mockCtx([{ body: listEnvelope([item(200), item(201)]) }]).ctx,
  );
  assertEquals(ids(r3.events), [201]);
});
