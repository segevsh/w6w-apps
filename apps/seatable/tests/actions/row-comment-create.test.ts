import { assertEquals } from "@std/assert";
import rowCommentCreate from "../../actions/row-comment-create.ts";
import { BASE_PATH, bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("row-comment-create: POSTs the comment with table_id and row_id in the query", async () => {
  // The vendor answers with the bare JSON string "success:true".
  const { ctx, calls } = mockCtx([{ body: '"success:true"' }]);
  const out = await rowCommentCreate.execute(
    { tableId: "0000", rowId: "r1", comment: "Looks good" },
    ctx,
  ) as { success: boolean };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/comments/`);
  assertEquals(queryOf(calls[0].url), { table_id: "0000", row_id: "r1" });
  assertEquals(bodyOf(calls[0]), { comment: "Looks good" });
  assertEquals(out.success, true);
});

Deno.test("row-comment-create: is not idempotent", () => {
  assertEquals(rowCommentCreate.idempotent, false);
});
