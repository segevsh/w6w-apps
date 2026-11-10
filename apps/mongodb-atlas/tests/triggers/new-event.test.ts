import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-event.ts";
const item = (id: string) => ({ id, eventTypeName: "CREATED", created: id });
const ctx = (items: unknown[]) => mockCtx([{ body: { results: items, totalCount: items.length } }]);
test("new-event seeds, emits events, retries, and requests the newest-first event feed", async () => {
  const seed = ctx([item("a")]);
  const input = {
    params: { projectId: "5f8d0d55b54eff0f2b2c3d4e" },
    state: {},
    subscriptionId: "sub",
  };
  const seeded = await trigger.poll!(input, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://cloud.mongodb.com/api/atlas/v2/groups/5f8d0d55b54eff0f2b2c3d4e/events?itemsPerPage=100&pageNum=1",
  );
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
