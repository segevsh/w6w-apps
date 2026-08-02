import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-comment.ts";

Deno.test("create-comment: POSTs /{postId}/comments with message as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  const result = await action.execute!({ postId: "post-1", message: "nice post" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v23.0/post-1/comments");
  assertEquals(url.searchParams.get("message"), "nice post");
  assertEquals(result, { id: "c1" });
});

Deno.test("create-comment: omits authorization (runtime injects it)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await action.execute!({ postId: "post-1", message: "hi" }, ctx);
  assert(!("authorization" in calls[0].headers));
});

Deno.test("create-comment: declares idempotent: false", () => {
  assertEquals(action.idempotent, false);
});
