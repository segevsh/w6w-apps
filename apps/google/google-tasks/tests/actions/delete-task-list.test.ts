import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-task-list.ts";

test("delete-task-list: DELETEs the list and returns a success sentinel", async () => {
  // Google documents an empty body here — 204 with nothing to parse.
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ taskList: "L1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/tasks/v1/users/@me/lists/L1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(out, { success: true });
});

test("delete-task-list: tolerates an empty 200 as well as a 204", async () => {
  const { ctx } = mockCtx([{ status: 200 }]);
  assertEquals(await action.execute!({ taskList: "L1" }, ctx), { success: true });
});
