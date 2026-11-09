import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-lead.ts";
test("new-lead seeds, emits, retries, and posts descending creation sort", async () => {
  const input = { params: {}, subscriptionId: "s" };
  const seed = mockCtx([{ body: { leads: [{ id: "a" }] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://api.agencyzoom.com/v1/api/leads/list");
  assertEquals(seed.calls[0].body, '{"sort":"createdDate","order":"desc","page":0,"pageSize":100}');
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: { leads: [{ id: "b" }, { id: "a" }] } }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: { leads: [{ id: "b" }, { id: "a" }] } }]).ctx,
  );
  assertEquals(first.events, [{ id: "b" }]);
  assertEquals(retry, first);
});
