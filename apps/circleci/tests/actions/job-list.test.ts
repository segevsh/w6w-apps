import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-list.ts";

Deno.test("job-list: GETs /workflow/{id}/job", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { items: [{ id: "job1", job_number: 7 }] } },
  ]);
  const result = await action.execute!({ workflowId: "wf1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://circleci.com/api/v2/workflow/wf1/job");
  assertEquals(result, { items: [{ id: "job1", job_number: 7 }] });
});

Deno.test("job-list: requires workflowId", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute!({}, ctx)), Error, "workflowId");
});
