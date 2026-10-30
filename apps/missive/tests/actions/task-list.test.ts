import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/task-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("task-list: lists tasks with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { tasks: [{ id: "t1" }] } }]);
  const out = await action.execute({ organization: "org-1", state: "todo", limit: 10 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/tasks");
  assertEquals(queryOf(calls[0].url), { organization: "org-1", state: "todo", limit: "10" });
  assertEquals(out, [{ id: "t1" }]);
});
