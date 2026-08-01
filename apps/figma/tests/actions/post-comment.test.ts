import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/post-comment.ts";

Deno.test("post-comment: POSTs a new comment with just a message", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", message: "hi" } }]);
  await action.execute({ fileKey: "abc123", message: "hi" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/files/abc123/comments");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { message: "hi" });
});

Deno.test("post-comment: includes comment_id and client_meta when given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c2" } }]);
  await action.execute({
    fileKey: "abc123",
    message: "reply",
    commentId: "c1",
    clientMeta: { x: 1, y: 2 },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    message: "reply",
    comment_id: "c1",
    client_meta: { x: 1, y: 2 },
  });
});
