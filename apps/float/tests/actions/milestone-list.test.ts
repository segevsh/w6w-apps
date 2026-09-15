import { assertEquals } from "@std/assert";
import milestoneList from "../../actions/milestone-list.ts";
import { asListResult, mockCtx, paginationHeaders, pathOf, queryOf } from "../_helpers.ts";

Deno.test("milestone-list - GETs /milestones filtered by project_id", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ milestone_id: 1 }],
    headers: paginationHeaders(),
  }]);
  const out = asListResult(await milestoneList.execute({ project_id: 4 }, ctx));
  assertEquals(pathOf(calls[0].url), "/v3/milestones");
  assertEquals(queryOf(calls[0].url).project_id, "4");
  assertEquals(out.items, [{ milestone_id: 1 }]);
});
