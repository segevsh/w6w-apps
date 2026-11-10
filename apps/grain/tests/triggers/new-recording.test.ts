import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-recording.ts";

test("new-recording seeds, emits, retries, and requests recordings", async () => {
  const seed = mockCtx([{ body: { recordings: [{ id: "a" }] } }]);
  const first = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(first.events, []);
  assertEquals((first.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://api.grain.com/_/public-api/v2/recordings");
});
