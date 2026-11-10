import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-audit-event.ts";

test("new-audit-event seeds, emits, retries, and requests a bounded audit page", async () => {
  const seed = mockCtx([{ body: { events: [{ id: "a" }] } }]);
  const first = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(first.events, []);
  assertEquals((first.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://public-api.granola.ai/v1/audit?page_size=100");
});
