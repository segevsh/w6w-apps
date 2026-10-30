import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import taskList from "../../actions/task-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("task-list: unwraps the {results} envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{ key: "task1" }] } }]);
  const out = await taskList.execute({ boxKey: "b1" }, ctx) as { results: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v1/boxes/b1/tasks");
  assertEquals(out.results, [{ key: "task1" }]);
});
