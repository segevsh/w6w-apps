import { assertEquals } from "@std/assert";
import milestoneUpdate from "../../actions/milestone-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("milestone-update - PATCHes /milestones/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { milestone_id: 9, name: "Renamed" } }]);
  const out = await milestoneUpdate.execute({ milestone_id: 9, name: "Renamed" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/milestones/9");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
  assertEquals(out, { milestone_id: 9, name: "Renamed" });
});
