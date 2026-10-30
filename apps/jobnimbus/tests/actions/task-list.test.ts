import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import taskList from "../../actions/task-list.ts";
import { listPage, mockCtx, pathOf } from "../_helpers.ts";

test("task-list: hits /tasks and returns {count, results}", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([{ jnid: "t1" }]) }]);
  const out = await taskList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api1/tasks");
  assertEquals(out, { count: 1, results: [{ jnid: "t1" }] });
});
