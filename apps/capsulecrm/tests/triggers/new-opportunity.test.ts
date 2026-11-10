import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import trigger from "../../triggers/new-opportunity.ts";

const T0 = Date.parse("2026-11-09T12:00:00Z");
const T1 = T0 + 300_000;
const input = { params: {}, subscriptionId: "sub-1" };
const wrap = (items: unknown[]) => ({ opportunities: items });
const ctx = (items: unknown[]) => mockCtx([{ status: 200, body: wrap(items) }]);
const at = (ms: number) => new Date(ms).toISOString();
const item = (
  id: number,
  createdMs: number,
  updatedMs = createdMs,
) => ({ id, name: `Deal ${id}`, createdAt: at(createdMs), updatedAt: at(updatedMs) });

test("new-opportunity: seeds the cursor without emitting", async () => {
  clock.now = () => T0;
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1, T0 - 60_000)]).ctx);
  assertEquals(seeded.events, []);
  const st = seeded.nextState as { seeded?: boolean; cursor?: number };
  assertEquals(st.seeded, true);
  assertEquals(st.cursor, T0);
});

test("new-opportunity: emits only the record created since the last check, retries idempotently", async () => {
  clock.now = () => T0;
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1, T0 - 60_000)]).ctx);
  clock.now = () => T1;
  const fresh = item(2, T1 - 30_000);
  const page = [item(1, T0 - 60_000), fresh];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [fresh]);
  assertEquals(retry, first);
  assertEquals((first.nextState as { cursor?: number }).cursor, T1);
});

test("new-opportunity: asks the list action for records since cursor minus the 120 s overlap", async () => {
  clock.now = () => T0;
  const seed = ctx([]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.capsulecrm.com/api/v2/opportunities?page=1&perPage=100&since=2026-11-09T11%3A58%3A00.000Z",
  );
  clock.now = () => T1;
  const next = ctx([]);
  await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
  assertEquals(
    next.calls[0].url,
    "https://api.capsulecrm.com/api/v2/opportunities?page=1&perPage=100&since=2026-11-09T11%3A58%3A00.000Z",
  );
});

test("new-opportunity: an edited record is not emitted", async () => {
  clock.now = () => T0;
  const old = item(7, T0 - 86_400_000, T0 - 60_000);
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([old]).ctx);
  clock.now = () => T1;
  const edit = item(7, T0 - 86_400_000, T1 - 30_000);
  const out = await trigger.poll!({ ...input, state: seeded.nextState }, ctx([edit]).ctx);
  assertEquals(out.events, []);
});
