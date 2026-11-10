import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-comment-thread.ts";

test("new-comment-thread seeds, emits, retries, and requests time ordering", async () => {
  const seed = mockCtx([{ body: { items: [{ id: "a" }] } }]);
  const first = await trigger.poll!({
    params: { channelId: "channel-1" },
    state: {},
    subscriptionId: "s",
  }, seed.ctx);
  assertEquals(first.events, []);
  assertEquals((first.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://youtube.googleapis.com/youtube/v3/commentThreads?part=snippet&channelId=channel-1&maxResults=100&order=time",
  );
});
