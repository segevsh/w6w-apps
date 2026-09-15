import { assertEquals } from "@std/assert";
import allocationList from "../../actions/allocation-list.ts";
import { asListResult, mockCtx, paginationHeaders, pathOf, queryOf } from "../_helpers.ts";

Deno.test("allocation-list - GETs /tasks (Float's own name for an allocation)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ task_id: 1 }],
    headers: paginationHeaders(),
  }]);
  const out = asListResult(await allocationList.execute({ project_id: 1345 }, ctx));
  assertEquals(pathOf(calls[0].url), "/v3/tasks");
  assertEquals(queryOf(calls[0].url).project_id, "1345");
  assertEquals(out.items, [{ task_id: 1 }]);
});
