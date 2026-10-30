import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import checklistList from "../../actions/checklist-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("checklist-list: GET /tasks/:task_id/checklists", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 26, name: "Checklist A" }] }]);
  const out = await checklistList.execute({ taskId: 12 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/tasks/12/checklists");
  assertEquals(out, [{ id: 26, name: "Checklist A" }]);
});
