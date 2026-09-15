import { assertEquals } from "@std/assert";
import workflowGet from "../../actions/workflow-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workflow-get: calls GET /workflows/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 5, name: "Engineering", states: [] } }]);
  const out = await workflowGet.execute({ workflowId: 5 }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/api/v3/workflows/5");
  assertEquals(out.name, "Engineering");
});
