import { assertEquals, assertRejects } from "@std/assert";
import deleteComment from "../../actions/delete-comment.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/** The one delete in this API that returns its subject rather than a `success` flag. */
Deno.test("delete-comment: returns the deleted comment", async () => {
  const { ctx, calls } = mockCtx([{
    body: { comment: { id: 79800950, content: "hi", deleted_at: "2026-01-01T00:00:00Z" } },
  }]);
  const out = await deleteComment.execute({ commentId: 79800950 }, ctx) as {
    deleted_at: string;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3.0/delete_comment/79800950");
  assertEquals(out.deleted_at, "2026-01-01T00:00:00Z");
});

Deno.test("delete-comment: a bad id fails before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await deleteComment.execute({ commentId: "x" as unknown as number }, ctx),
    Error,
    "commentId must be a positive integer id",
  );
  assertEquals(calls.length, 0);
});

Deno.test("delete-comment: is idempotent", () => {
  assertEquals(deleteComment.idempotent, true);
});
