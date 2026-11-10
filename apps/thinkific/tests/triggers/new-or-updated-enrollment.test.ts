import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-enrollment.ts";
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

test("new-or-updated-enrollment seeds without a request, emits the new row, retries identically", async () => {
  const state = await seedState();
  at(T1);
  const run = () =>
    trigger.poll!({ ...input, state }, mockCtx([{ body: listEnvelope([item(7)]) }]).ctx);
  const first = await run();
  const retry = await run();
  assertEquals(ids(first.events), [7]);
  assertEquals(retry, first);
});

test("new-or-updated-enrollment requests the literal updated_after/updated_before window", async () => {
  const state = await seedState();
  at(T1);
  const m = mockCtx([{ body: listEnvelope([]) }]);
  await trigger.poll!({ ...input, state }, m.ctx);
  assertEquals(m.calls[0].method, "GET");
  // The window starts at the seed (never before it) and ends at the check time.
  assertEquals(
    m.calls[0].url,
    "https://api.thinkific.com/api/public/v1/enrollments?page=1&limit=100" +
      "&query%5Bupdated_before%5D=2026-11-09T12%3A10%3A00.000Z" +
      "&query%5Bupdated_after%5D=2026-11-09T12%3A00%3A00.000Z",
  );
});

test("new-or-updated-enrollment drains a window of 2 full pages across checks: each row once, cursor after", async () => {
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
      "&query%5Bupdated_before%5D=2026-11-09T12%3A10%3A00.000Z" +
      "&query%5Bupdated_after%5D=2026-11-09T12%3A00%3A00.000Z",
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

const edited = (id: number, updated_at: string) => ({ id, updated_at });

test("new-or-updated-enrollment emits an edit (same id, new updated_at) and drops pre-seed stamps", async () => {
  const state = await seedState();
  at(T1);
  const before = edited(5, "2026-11-09T12:05:00.000Z");
  const first = await trigger.poll!(
    { ...input, state },
    mockCtx([{
      body: listEnvelope([before, edited(6, "2026-11-09T11:59:59.000Z")]),
    }]).ctx,
  );
  // 6 was last updated before the seed: never emitted. 5 is a real post-seed change.
  assertEquals(first.events, [before]);
  at(T1 + 300_000);
  const after = edited(5, "2026-11-09T12:12:00.000Z");
  const second = await trigger.poll!(
    { ...input, state: first.nextState },
    mockCtx([{ body: listEnvelope([after, before]) }]).ctx,
  );
  assertEquals(second.events, [after]);
});
