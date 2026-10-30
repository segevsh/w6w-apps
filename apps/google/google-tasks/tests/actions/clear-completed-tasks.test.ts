import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/clear-completed-tasks.ts";

test("clear-completed-tasks: POSTs to /clear with an empty body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ taskList: "L1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/tasks/v1/lists/L1/clear");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  assertEquals(out, { success: true });
});

test("clear-completed-tasks: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
