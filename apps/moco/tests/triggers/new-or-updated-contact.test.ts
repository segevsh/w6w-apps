import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockMocoCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-or-updated-contact.ts";
const item = (id: number, stamp: string) => ({ id, updated_at: stamp });
const ctx = (items: unknown[]) =>
  mockMocoCtx([{
    body: items,
    headers: { "x-page": "1", "x-per-page": "100", "x-total": String(items.length) },
  }]);
const T0 = Date.parse("2026-11-09T12:00:00Z");
const input = { params: {}, subscriptionId: "sub" };
const seedState = () => ({ v: 1, kind: "ids", seeded: true, ids: ["1:s1"], cursor: T0 });
test("seeds the cursor without a request or events", async () => {
  clock.now = () => T0;
  const seed = ctx([]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals((seeded.nextState as { cursor?: number }).cursor, T0);
  assertEquals(seed.calls.length, 0);
});
test("emits a new contact, is idempotent, and sends cursor minus overlap as updated_after", async () => {
  clock.now = () => T0 + 300_000;
  const page = [item(2, "s2"), item(1, "s1")];
  const run = ctx(page);
  const first = await trigger.poll!({ ...input, state: seedState() }, run.ctx);
  const retry = await trigger.poll!({ ...input, state: seedState() }, ctx(page).ctx);
  assertEquals(first.events, [item(2, "s2")]);
  assertEquals(retry, first);
  assertEquals(
    run.calls[0].url,
    "https://acme.mocoapp.com/api/v1/contacts/people?page=1&per_page=100&updated_after=2026-11-09T11%3A58%3A00.000Z",
  );
  assertEquals((first.nextState as { cursor?: number }).cursor, T0 + 300_000);
});
test("an edited contact (same id, new updated_at) is emitted once", async () => {
  clock.now = () => T0 + 300_000;
  const edited = await trigger.poll!({ ...input, state: seedState() }, ctx([item(1, "s2")]).ctx);
  assertEquals(edited.events, [item(1, "s2")]);
  const again = await trigger.poll!(
    { ...input, state: edited.nextState },
    ctx([item(1, "s2")]).ctx,
  );
  assertEquals(again.events, []);
});
