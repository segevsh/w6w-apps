import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import trigger from "../../triggers/new-or-updated-document.ts";

const T0 = Date.parse("2026-11-09T12:00:00Z");
const T1 = T0 + 300_000;
const input = { params: {}, subscriptionId: "sub-1" };
const wrap = (items: unknown[]) => listEnvelope(items);
const ctx = (items: unknown[]) => mockCtx([{ status: 200, body: wrap(items) }]);
const at = (ms: number) => new Date(ms).toISOString();
const item = (
  id: number,
  createdMs: number,
  updatedMs = createdMs,
) => ({
  id,
  name: `Document ${id}`,
  type: "Person",
  created_at: at(createdMs),
  updated_at: at(updatedMs),
});

test("new-or-updated-document: seeds the cursor without emitting", async () => {
  clock.now = () => T0;
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1, T0 - 60_000)]).ctx);
  assertEquals(seeded.events, []);
  const st = seeded.nextState as { seeded?: boolean; cursor?: number };
  assertEquals(st.seeded, true);
  assertEquals(st.cursor, T0);
});

test("new-or-updated-document: emits only the record created since the last check, retries idempotently", async () => {
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

test("new-or-updated-document: asks the list action for records since cursor minus the 120 s overlap", async () => {
  clock.now = () => T0;
  const seed = ctx([]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://app.clio.com/api/v4/documents.json?updated_since=2026-11-09T11%3A58%3A00.000Z&fields=id%2Cetag%2Cname%2Ccontent_type%2Ccreated_at%2Cupdated_at%2Cmatter%7Bid%2Cdisplay_number%7D&limit=100&order=id%28asc%29",
  );
  clock.now = () => T1;
  const next = ctx([]);
  await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
  assertEquals(
    next.calls[0].url,
    "https://app.clio.com/api/v4/documents.json?updated_since=2026-11-09T11%3A58%3A00.000Z&fields=id%2Cetag%2Cname%2Ccontent_type%2Ccreated_at%2Cupdated_at%2Cmatter%7Bid%2Cdisplay_number%7D&limit=100&order=id%28asc%29",
  );
});

test("new-or-updated-document: an edited record is emitted", async () => {
  clock.now = () => T0;
  const old = item(7, T0 - 86_400_000, T0 - 60_000);
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([old]).ctx);
  clock.now = () => T1;
  const edit = item(7, T0 - 86_400_000, T1 - 30_000);
  const out = await trigger.poll!({ ...input, state: seeded.nextState }, ctx([edit]).ctx);
  assertEquals(out.events, [edit]);
});
