import { assertEquals } from "@std/assert";
import milestoneGet from "../../actions/milestone-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("milestone-get - GETs /milestones/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { milestone_id: 1, name: "Sprint #14" } }]);
  const out = await milestoneGet.execute({ milestone_id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/milestones/1");
  assertEquals(out, { milestone_id: 1, name: "Sprint #14" });
});
