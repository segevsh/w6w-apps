import { assertEquals } from "@std/assert";
import workflowRulesList from "../../actions/workflow-rules-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workflow-rules-list: GET /v1/workflows/{id}/rules wraps the array", async () => {
  const rule = { id: "r1", trigger_type: "event_created", actions: [] };
  const { ctx, calls } = mockCtx([{ body: [rule] }]);
  const out = await workflowRulesList.execute({ workflowId: "wf_1" }, ctx) as { rules: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/workflows/wf_1/rules");
  assertEquals(out.rules, [rule]);
});
