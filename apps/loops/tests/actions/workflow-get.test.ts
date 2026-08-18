import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workflow-get.ts";

Deno.test("workflow-get: reads one workflow by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "w1", nodes: [] } }]);
  const result = await action.execute!({ workflowId: "w1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://app.loops.so/api/v1/workflows/w1");
  assertEquals(result.nodes, []);
});

Deno.test("workflow-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`workflowId`");
  assertEquals(calls.length, 0);
});
