import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import pipelineList from "../../actions/pipeline-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("pipeline-list: calls GET /pipelines and returns the bare array as results", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ key: "p1" }, { key: "p2" }] }]);
  const out = await pipelineList.execute({}, ctx) as { results: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines");
  assertEquals(out.results.length, 2);
});

test("pipeline-list: forwards sortBy", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await pipelineList.execute({ sortBy: "lastUpdatedTimestamp" }, ctx);
  assertEquals(queryOf(calls[0].url), { sortBy: "lastUpdatedTimestamp" });
});
