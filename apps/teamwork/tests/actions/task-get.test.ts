import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockTeamworkCtx } from "../_helpers.ts";
import action from "../../actions/task-get.ts";

test("task-get: GETs /projects/api/v3/tasks/{id}.json and unwraps `task`", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ body: { task: { id: 9, name: "Do it" } } }]);
  const out = await action.execute({ taskId: 9 }, ctx);
  assertEquals(calls[0].url, "https://acme.teamwork.com/projects/api/v3/tasks/9.json");
  assertEquals(out, { id: 9, name: "Do it" });
});
