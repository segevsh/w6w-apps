import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workflow-get.ts";

Deno.test("workflow-get: GETs /workflow/{id}", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "wf1", status: "running" } },
  ]);
  const result = await action.execute!({ workflowId: "wf1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://circleci.com/api/v2/workflow/wf1");
  assertEquals(result, { id: "wf1", status: "running" });
});

Deno.test("workflow-get: requires workflowId", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute!({}, ctx)), Error, "workflowId");
});
