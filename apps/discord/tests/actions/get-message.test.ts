import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-message.ts";

test("get-message: GETs /channels/{cid}/messages/{mid}", async () => {
  const body = { id: "m1", content: "hi" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ channelId: "c1", messageId: "m1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/v10/channels/c1/messages/m1");
  assertEquals(result, body);
});
