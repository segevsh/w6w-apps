import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import workflowRunList from "../../actions/workflow-run-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("workflow-run-list: GET /workflow_runs", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uid: "wr1", status: "completed" }] }]);
  const out = await workflowRunList.execute({}, ctx) as unknown[];

  assertEquals(pathOf(calls[0].url), "/workflow_runs");
  assertEquals(out, [{ uid: "wr1", status: "completed" }]);
});
