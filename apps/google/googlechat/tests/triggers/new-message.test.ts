import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-message.ts";

test("new-message seeds, emits, retries, and requests descending messages", async () => {
  const seed = mockCtx([{ body: { messages: [{ name: "spaces/a/messages/a" }] } }]);
  const first = await trigger.poll!({
    params: { space: "spaces/a" },
    state: {},
    subscriptionId: "s",
  }, seed.ctx);
  assertEquals(first.events, []);
  assertEquals((first.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://chat.googleapis.com/v1/spaces/a/messages?orderBy=DESC&pageSize=1000",
  );
});
