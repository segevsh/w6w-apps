import { assertEquals } from "@std/assert";
import workflowApprovalUpdate from "../../actions/workflow-approval-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workflow-approval-update: PATCH approvals/{roleId}, bare true unwrapped", async () => {
  const { ctx, calls } = mockCtx([{ body: "true" }]);
  const out = await workflowApprovalUpdate.execute(
    { workflowId: "w1", roleId: "finance", status: "approved", userEmail: "a@b.co" },
    ctx,
  ) as { updated: boolean };
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/public/api/v1/workflows/w1/approvals/finance");
  assertEquals(JSON.parse(calls[0].body!), {
    status: "approved",
    user: { email: "a@b.co", type: "email" },
  });
  assertEquals(out.updated, true);
});

Deno.test("workflow-approval-update: omits user when none is given", async () => {
  const { ctx, calls } = mockCtx([{ body: "true" }]);
  await workflowApprovalUpdate.execute({ workflowId: "w1", roleId: "r", status: "pending" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { status: "pending" });
});
