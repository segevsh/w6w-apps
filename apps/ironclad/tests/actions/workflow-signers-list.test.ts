import { assertEquals } from "@std/assert";
import workflowSignersList from "../../actions/workflow-signers-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workflow-signers-list: GET /workflows/{id}/signatures", async () => {
  const { ctx, calls } = mockCtx([{ body: { workflowId: "w1", signers: [{ name: "A" }] } }]);
  const out = await workflowSignersList.execute({ workflowId: "w1" }, ctx) as {
    signers: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/public/api/v1/workflows/w1/signatures");
  assertEquals(out.signers.length, 1);
});
