import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import bookTagDelete from "../../actions/book-tag-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("book-tag-delete: DELETEs by tag id and reports the 204 status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await bookTagDelete.execute({ bookId: "59767830", tagId: "11311390" }, ctx) as {
    status: number;
  };

  assertEquals(pathOf(calls[0].url), "/api/v2/books/59767830/tags/11311390");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.status, 204);
});
