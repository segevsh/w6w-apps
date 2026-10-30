import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockTeamworkCtx } from "../_helpers.ts";
import action from "../../actions/task-delete.ts";

test("task-delete: DELETEs /projects/api/v3/tasks/{id}.json", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ status: 204 }]);
  const out = await action.execute({ taskId: 9 }, ctx);
  assertEquals(calls[0].url, "https://acme.teamwork.com/projects/api/v3/tasks/9.json");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { success: true });
});
