import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import chatDelete from "../../actions/chat-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("chat-delete: DELETEs /v2/chats/{iden}", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await chatDelete.execute({ iden: "c1" }, ctx) as { deleted: boolean };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/chats/c1");
  assertEquals(out.deleted, true);
});

test("chat-delete: is declared idempotent", () => {
  assertEquals(chatDelete.idempotent, true);
});
