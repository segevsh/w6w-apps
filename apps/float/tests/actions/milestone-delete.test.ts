import { assertEquals } from "@std/assert";
import milestoneDelete from "../../actions/milestone-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("milestone-delete - DELETEs /milestones/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await milestoneDelete.execute({ milestone_id: 9 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/milestones/9");
  assertEquals(out, { deleted: true, milestone_id: 9 });
});
