import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workflow-cancel.ts";

Deno.test("workflow-cancel: POSTs to /workflow/{id}/cancel", async () => {
  const { ctx, calls } = mockCtx([
    { status: 202, body: { message: "Accepted." } },
  ]);
  const result = await action.execute!({ workflowId: "wf1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://circleci.com/api/v2/workflow/wf1/cancel");
  assertEquals(result, { message: "Accepted." });
});

Deno.test("workflow-cancel: requires workflowId", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute!({}, ctx)), Error, "workflowId");
});
