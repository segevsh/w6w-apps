import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-task-list.ts";

test("update-task-list: PATCHes displayName on the encoded list id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "L=1", displayName: "Renamed" } }]);
  await action.execute!({ taskList: "L=1", displayName: "Renamed" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/todo/lists/L%3D1");
  assertEquals(JSON.parse(calls[0].body!), { displayName: "Renamed" });
});

test("update-task-list: renaming is idempotent", () => {
  assertEquals(action.idempotent, true);
});
