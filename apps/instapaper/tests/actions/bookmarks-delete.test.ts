import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import bookmarksDelete from "../../actions/bookmarks-delete.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

test("bookmarks-delete: posts bookmark_id and returns it on the documented empty-array success", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  const result = await bookmarksDelete.execute({ bookmarkId: 7 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/1/bookmarks/delete");
  assertEquals(bodyOf(calls[0]), { bookmark_id: "7" });
  assertEquals(result, { bookmark_id: 7 });
});

test("bookmarks-delete: is marked idempotent", () => {
  assertEquals(bookmarksDelete.idempotent, true);
});
