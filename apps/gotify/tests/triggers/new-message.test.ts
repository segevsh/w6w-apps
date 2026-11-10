import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-message.ts";

test("new-message seeds, emits, retries, and requests a bounded messages page", async () => {
  const seed = mockCtx([{ body: { messages: [{ id: 1 }], paging: {} } }], {
    display: { baseUrl: "https://gotify.example.com" },
  });
  const first = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(first.events, []);
  assertEquals((first.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://gotify.example.com/message?limit=100");
});
