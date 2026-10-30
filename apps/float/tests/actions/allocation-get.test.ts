import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import allocationGet from "../../actions/allocation-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("allocation-get - GETs /tasks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { task_id: 7654321, project_id: 1345 } }]);
  const out = await allocationGet.execute({ task_id: 7654321 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/tasks/7654321");
  assertEquals(out, { task_id: 7654321, project_id: 1345 });
});
