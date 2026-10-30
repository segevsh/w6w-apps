import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-subscriber.ts";

test("delete-subscriber: DELETEs /api/subscribers/{id} and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await action.execute!({ subscriberId: "31986843064993537" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/subscribers/31986843064993537");
  assertEquals(calls[0].body, null);
  assertEquals(result, { success: true });
});

test("delete-subscriber: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
