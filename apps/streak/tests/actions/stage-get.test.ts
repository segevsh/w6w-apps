import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import stageGet from "../../actions/stage-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("stage-get: calls GET /pipelines/{pipelineKey}/stages/{stageKey}", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "Resume", key: "5001" } }]);
  await stageGet.execute({ pipelineKey: "p1", stageKey: "5001" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines/p1/stages/5001");
});
