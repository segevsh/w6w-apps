import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workflow-run-get.ts";

test("workflow-run-get: GETs /workflow-runs/{id} with no envelope wrapper", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "run1", status: "Active", workflowId: "w1", shared: false },
  }]);
  const out = await action.execute({ workflowRunId: "run1" }, ctx);
  assertEquals(calls[0].url, "https://public-api.process.st/api/v1.1/workflow-runs/run1");
  assertEquals(out.workflowRun, { id: "run1", status: "Active", workflowId: "w1", shared: false });
});
