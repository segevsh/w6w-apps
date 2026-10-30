import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-message.ts";

test("get-message: GETs /messages/{messageId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  const result = await action.execute({ messageId: "m1" }, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/messages/m1");
  assertEquals(result, { id: "m1" });
});
