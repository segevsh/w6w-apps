import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import pipelineDelete from "../../actions/pipeline-delete.ts";
import { mockCtx, pathOf, successBody } from "../_helpers.ts";

test("pipeline-delete: DELETEs and returns {success}", async () => {
  const { ctx, calls } = mockCtx([{ body: successBody() }]);
  const out = await pipelineDelete.execute({ pipelineKey: "p1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines/p1");
  assertEquals(out, { success: true });
});
