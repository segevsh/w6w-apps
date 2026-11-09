import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-user.ts";
const page = (results: unknown[]) => ({ success: true, results, moreDataAvailable: false });
test("new-user seeds, emits, retries, and requests one bounded page", async () => {
  const input = { params: {}, subscriptionId: "s" };
  const seed = mockCtx([{ body: page([{ id: "a" }]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://api.ashbyhq.com/user.list");
  assertEquals(seed.calls[0].body, '{"limit":100}');
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([{ id: "b" }, { id: "a" }]) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([{ id: "b" }, { id: "a" }]) }]).ctx,
  );
  assertEquals(first.events, [{ id: "b" }]);
  assertEquals(retry, first);
});
