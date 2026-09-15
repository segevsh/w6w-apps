import { assertEquals } from "@std/assert";
import epicCommentCreate from "../../actions/epic-comment-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("epic-comment-create: posts text to /epics/{id}/comments", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await epicCommentCreate.execute({ epicId: 9, text: "Looks good" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3/epics/9/comments");
  assertEquals(JSON.parse(calls[0].body!), { text: "Looks good" });
});
