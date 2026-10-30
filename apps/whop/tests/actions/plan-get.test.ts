import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import planGet from "../../actions/plan-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("plan-get: GETs /plans/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "plan_1" } }]);
  const out = await planGet.execute({ planId: "plan_1" }, ctx) as { id: string };
  assertEquals(pathOf(calls[0].url), "/plans/plan_1");
  assertEquals(out.id, "plan_1");
});

test("plan-get: declares requiresAuth false — it is a public read", () => {
  assert(planGet.requiresAuth === false);
});
