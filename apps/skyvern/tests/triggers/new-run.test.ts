import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-run.ts";

const item = (run_id: string) => ({ run_id });
const input = { params: {}, subscriptionId: "sub-1" };

test("new-run seeds, emits new rows, retries, and requests the literal first page", async () => {
  const seed = mockCtx([{ body: [item("a")] }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.skyvern.com/v1/runs?page=1&page_size=100");
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: [item("b"), item("a")] }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: [item("b"), item("a")] }]).ctx,
  );
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
