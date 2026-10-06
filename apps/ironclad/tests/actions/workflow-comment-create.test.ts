import { assertEquals } from "@std/assert";
import workflowCommentCreate from "../../actions/workflow-comment-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workflow-comment-create: POST /workflows/{id}/comments, never the deprecated /comment", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", commentMessage: "hi" } }]);
  const out = await workflowCommentCreate.execute(
    { workflowId: "w1", comment: "hi", repliedToActivityFeedMessageId: "c0" },
    ctx,
  ) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/public/api/v1/workflows/w1/comments");
  assertEquals(JSON.parse(calls[0].body!), { comment: "hi", repliedToActivityFeedMessageId: "c0" });
  assertEquals(out.id, "c1");
});
