import { test } from "node:test";
import { assertEquals, assertRejects, assertStringIncludes } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workflow-list.ts";

test("workflow-list: GETs /pipeline/{id}/workflow", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { items: [{ id: "wf1" }] } },
  ]);
  const result = await action.execute!({ pipelineId: "pipe-uuid-1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://circleci.com/api/v2/pipeline/pipe-uuid-1/workflow");
  assertEquals(result, { items: [{ id: "wf1" }] });
});

test("workflow-list: forwards page-token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [] } }]);
  await action.execute!({ pipelineId: "pipe-uuid-1", pageToken: "cursor123" }, ctx);

  assertStringIncludes(calls[0].url, "page-token=cursor123");
});

test("workflow-list: requires pipelineId", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute!({}, ctx)), Error, "pipelineId");
});
