import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workflow-run-delete.ts";

test("workflow-run-delete: is idempotent per the spec's own DELETE rule", () => {
  assertEquals(action.idempotent, true);
});

test("workflow-run-delete: DELETEs /workflow-runs/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await action.execute({ workflowRunId: "run1" }, ctx);
  assertEquals(calls[0].url, "https://public-api.process.st/api/v1.1/workflow-runs/run1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true });
});

test("workflow-run-delete: a 404 (already deleted) is treated as success", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "Not found", errorCode: "NotFound" } }]);
  const out = await action.execute({ workflowRunId: "run1" }, ctx);
  assertEquals(out, { deleted: true });
});

test("workflow-run-delete: any other failure still throws", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { error: "boom" } }]);
  let threw = false;
  try {
    await action.execute({ workflowRunId: "run1" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
