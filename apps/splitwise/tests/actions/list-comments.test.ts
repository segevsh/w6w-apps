import { assertEquals, assertRejects } from "@std/assert";
import listComments from "../../actions/list-comments.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const THREAD = {
  comments: [
    {
      id: 1,
      comment_type: "System",
      content: "John D. updated this transaction: - The cost changed from $6.99 to $8.99",
    },
    { id: 2, comment_type: "User", content: "Does this include the delivery fee?" },
    { id: 3, comment_type: "User", content: "deleted one", deleted_at: "2026-01-01T00:00:00Z" },
  ],
};

/** The only endpoint here that identifies its subject by query, not by path. */
Deno.test("list-comments: sends expense_id as a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: THREAD }]);
  await listComments.execute({ expenseId: 5123 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3.0/get_comments");
  assertEquals(queryOf(calls[0].url), { expense_id: "5123" });
});

/**
 * Half the thread is Splitwise's own audit trail, rendered as prose. A workflow
 * treating every row as human-written will act on those.
 */
Deno.test("list-comments: separates the human-written, undeleted comments", async () => {
  const { ctx } = mockCtx([{ body: THREAD }]);
  const out = await listComments.execute({ expenseId: 5123 }, ctx) as {
    comments: unknown[];
    user_comments: Array<{ id: number }>;
  };

  assertEquals(out.comments.length, 3);
  assertEquals(out.user_comments.length, 1);
  assertEquals(out.user_comments[0].id, 2);
});

Deno.test("list-comments: a bad expense id fails before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await listComments.execute({ expenseId: 0 }, ctx),
    Error,
    "expenseId must be a positive integer id",
  );
  assertEquals(calls.length, 0);
});
