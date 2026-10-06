import { assertEquals } from "@std/assert";
import workflowApprovalsList from "../../actions/workflow-approvals-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workflow-approvals-list: GET /workflows/{id}/approvals", async () => {
  const { ctx, calls } = mockCtx([{ body: { workflowId: "w1", approvalGroups: [] } }]);
  const out = await workflowApprovalsList.execute({ workflowId: "w1" }, ctx) as {
    approvalGroups: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/public/api/v1/workflows/w1/approvals");
  assertEquals(out.approvalGroups, []);
});
