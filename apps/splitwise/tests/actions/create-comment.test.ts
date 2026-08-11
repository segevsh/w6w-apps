import { assertEquals, assertRejects } from "@std/assert";
import createComment from "../../actions/create-comment.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const CREATED = {
  comment: { id: 79800950, comment_type: "User", content: "hi", relation_id: 5123 },
};

Deno.test("create-comment: posts expense_id and content at top level", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  const out = await createComment.execute({ expenseId: 5123, content: "hi" }, ctx) as {
    id: number;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3.0/create_comment");
  assertEquals(bodyOf(calls[0]), { expense_id: 5123, content: "hi" });
  assertEquals(out.id, 79800950);
});

Deno.test("create-comment: an empty comment fails before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await createComment.execute({ expenseId: 1, content: "   " }, ctx),
    Error,
    "content is required",
  );
  assertEquals(calls.length, 0);
});

/** Splitwise does not deduplicate comments — a retry posts twice in a thread people read. */
Deno.test("create-comment: is declared non-idempotent", () => {
  assertEquals(createComment.idempotent, false);
});
