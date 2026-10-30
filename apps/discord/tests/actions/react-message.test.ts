import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/react-message.ts";

test("react-message: PUTs /reactions/{emoji}/@me and URL-encodes the emoji", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!(
    { channelId: "c1", messageId: "m1", emoji: "👍" },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  // Unicode chars in emoji get percent-encoded so they survive URL parsing.
  const path = new URL(calls[0].url).pathname;
  assertEquals(
    path,
    `/api/v10/channels/c1/messages/m1/reactions/${encodeURIComponent("👍")}/@me`,
  );
  assertEquals(result, { success: true });
});

test("react-message: works with custom emoji `name:id` values", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!(
    { channelId: "c1", messageId: "m1", emoji: "myemoji:12345" },
    ctx,
  );
  const path = new URL(calls[0].url).pathname;
  assertEquals(
    path,
    "/api/v10/channels/c1/messages/m1/reactions/myemoji%3A12345/@me",
  );
});
