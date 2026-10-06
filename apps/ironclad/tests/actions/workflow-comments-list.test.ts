import { assertEquals } from "@std/assert";
import workflowCommentsList from "../../actions/workflow-comments-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("workflow-comments-list: GET /workflows/{id}/comments with paging", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "c1" }]) }]);
  await workflowCommentsList.execute({ workflowId: "w1", page: 1, pageSize: 5 }, ctx);
  assertEquals(pathOf(calls[0].url), "/public/api/v1/workflows/w1/comments");
  assertEquals(queryOf(calls[0].url), { page: "1", pageSize: "5" });
});
