import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-subscriber.ts";

Deno.test("delete-subscriber: DELETEs /api/subscribers/{id} and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await action.execute!({ subscriberId: "31986843064993537" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/subscribers/31986843064993537");
  assertEquals(calls[0].body, null);
  assertEquals(result, { success: true });
});

Deno.test("delete-subscriber: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
