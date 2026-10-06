import { assert, assertEquals, assertRejects } from "@std/assert";
import workflowCancel from "../../actions/workflow-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workflow-cancel: POST /workflows/{id}/cancel with a comment, 204 handled", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await workflowCancel.execute(
    { workflowId: "w1", message: "because", addUsersToWorkflow: true },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/public/api/v1/workflows/w1/cancel");
  assertEquals(JSON.parse(calls[0].body!), {
    comment: { message: "because", addUsersToWorkflow: true },
  });
  assertEquals(out, { workflowId: "w1", cancelled: true });
});

Deno.test("workflow-cancel: a wrong-state failure keeps its code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { code: "INVALID_STATE", message: "workflow is not in a state that allows this" },
  }]);
  const err = await assertRejects(async () =>
    await workflowCancel.execute({ workflowId: "w1", message: "m" }, ctx)
  );
  assert((err as Error).message.includes("INVALID_STATE"));
});
