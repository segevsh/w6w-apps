import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listPage, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-interview.ts";

test("new-interview seeds, emits, retries, and requests a bounded interviews page", async () => {
  const seed = mockCtx([listPage([{ id: 1 }])]);
  const first = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(first.events, []);
  assertEquals((first.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://harvest.greenhouse.io/v3/interviews?per_page=100");
});
