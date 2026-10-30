import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pipeline-get.ts";

test("pipeline-get: GETs /project/{slug}/pipeline/{number}", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "pipe1", number: 42 } },
  ]);
  const result = await action.execute!({ projectSlug: "gh/org/repo", pipelineNumber: 42 }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://circleci.com/api/v2/project/gh/org/repo/pipeline/42");
  assertEquals(result, { id: "pipe1", number: 42 });
});

test("pipeline-get: requires projectSlug", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ pipelineNumber: 1 }, ctx)),
    Error,
    "projectSlug",
  );
});

test("pipeline-get: requires pipelineNumber", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ projectSlug: "gh/org/repo" }, ctx)),
    Error,
    "pipelineNumber",
  );
});
