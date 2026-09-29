import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-message.ts";

Deno.test("delete-message: DELETEs /messages/{messageId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ messageId: "m1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://webexapis.com/v1/messages/m1");
  assertEquals(result, { deleted: true });
});
