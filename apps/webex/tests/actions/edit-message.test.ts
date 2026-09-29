import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/edit-message.ts";

Deno.test("edit-message: PUTs /messages/{messageId} with roomId and text", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute({ messageId: "m1", roomId: "r1", text: "updated" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://webexapis.com/v1/messages/m1");
  assertEquals(JSON.parse(calls[0].body!), { roomId: "r1", text: "updated" });
});

Deno.test("edit-message: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
