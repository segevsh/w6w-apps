import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import workflowRunCreate from "../../actions/workflow-run-create.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

test("workflow-run-create: POST /workflow_runs", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "wr1", status: "queued" } }]);
  const out = await workflowRunCreate.execute(
    { workflow: "wf1", inputs: { headline: "Hello" }, metadata: "row-1" },
    ctx,
  ) as unknown as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/workflow_runs");
  assertEquals(JSON.parse(calls[0].body!), {
    workflow: "wf1",
    inputs: { headline: "Hello" },
    metadata: "row-1",
  });
  assertEquals(out.uid, "wr1");
});

test("workflow-run-create: requires a workflow", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => workflowRunCreate.execute({ workflow: "" }, ctx));
});

test("workflow-run-create: not idempotent", () => {
  assertEquals(workflowRunCreate.idempotent, false);
});
