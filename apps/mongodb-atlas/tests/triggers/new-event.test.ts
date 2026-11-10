import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-event.ts";
const item = (id: string, created = id) => ({ id, eventTypeName: "CREATED", created });
const ctx = (items: unknown[]) => mockCtx([{ body: { results: items, totalCount: items.length } }]);
const T0 = Date.parse("2026-11-09T12:00:00Z");
const input = {
  params: { projectId: "5f8d0d55b54eff0f2b2c3d4e" },
  subscriptionId: "sub",
};
const seedState = () => ({ v: 1, kind: "ids", seeded: true, ids: ["a"], cursor: T0 });
test("seeds the cursor without a request or events", async () => {
  clock.now = () => T0;
  const seed = ctx([]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals((seeded.nextState as { cursor?: number }).cursor, T0);
  assertEquals(seed.calls.length, 0);
});
test("emits a new event, is idempotent, and sends cursor minus overlap as minDate", async () => {
  clock.now = () => T0 + 300_000;
  const page = [item("c", "2"), item("b", "1"), item("a", "0")];
  const run = ctx(page);
  const first = await trigger.poll!({ ...input, state: seedState() }, run.ctx);
  const retry = await trigger.poll!({ ...input, state: seedState() }, ctx(page).ctx);
  assertEquals(first.events, [item("b", "1"), item("c", "2")]);
  assertEquals(retry, first);
  assertEquals(
    run.calls[0].url,
    "https://cloud.mongodb.com/api/atlas/v2/groups/5f8d0d55b54eff0f2b2c3d4e/events?minDate=2026-11-09T11%3A58%3A00.000Z&itemsPerPage=100&pageNum=1",
  );
  assertEquals((first.nextState as { cursor?: number }).cursor, T0 + 300_000);
});
