import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import planDelete from "../../actions/plan-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("plan-delete: DELETEs /plans/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "plan_1", deleted: true } }]);
  const out = await planDelete.execute({ planId: "plan_1" }, ctx) as { deleted: boolean };
  assertEquals(pathOf(calls[0].url), "/plans/plan_1");
  assertEquals(out.deleted, true);
});
