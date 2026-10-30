import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import messageDelete from "../../actions/message-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("message-delete: DELETEs /messages/{id} and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await messageDelete.execute({ id: 4991 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/messages/4991");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});

test("message-delete: is idempotent", () => {
  assertEquals(messageDelete.idempotent, true);
});
