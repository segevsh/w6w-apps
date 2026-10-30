import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-message.ts";

test("delete-message: DELETEs /channels/{cid}/messages/{mid} and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ channelId: "c1", messageId: "m1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/v10/channels/c1/messages/m1");
  assertEquals(result, { success: true });
});
