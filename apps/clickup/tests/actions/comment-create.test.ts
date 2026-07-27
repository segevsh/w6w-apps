import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/comment-create.ts";

Deno.test("comment-create: POSTs to /{resource}/{id}/comment", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await action.execute!({
    commentOn: "task",
    id: "t1",
    commentText: "hi",
    assignee: 4,
    notifyAll: true,
  }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/api/v2/task/t1/comment");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.comment_text, "hi");
  assertEquals(body.assignee, 4);
  assertEquals(body.notify_all, true);
});

Deno.test("comment-create: targets a list when commentOn is list", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c2" } }]);
  await action.execute!({ commentOn: "list", id: "l9", commentText: "yo" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/list/l9/comment");
});
