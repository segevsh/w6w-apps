import { assertEquals } from "@std/assert";
import workspaceSubmissionList from "../../actions/workspace-submission-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("workspace-submission-list: GET /workspaces/{id}/submissions", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "s" }]) }]);
  const out = await workspaceSubmissionList.execute(
    { workspaceId: "w1", search: "refund" },
    ctx,
  ) as { data: unknown[] };
  assertEquals(pathOf(calls[0].url), "/public/v1/workspaces/w1/submissions");
  assertEquals(queryOf(calls[0].url), { search: "refund" });
  assertEquals(out.data, [{ id: "s" }]);
});
