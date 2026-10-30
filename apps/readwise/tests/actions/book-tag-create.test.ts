import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import bookTagCreate from "../../actions/book-tag-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("book-tag-create: POSTs to the collection WITH a trailing slash", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "philosophy" } }]);
  await bookTagCreate.execute({ bookId: "59767830", name: "philosophy" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/books/59767830/tags/");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "philosophy" });
});

test("book-tag-create: is not idempotent — no vendor de-dupe is documented", () => {
  assertEquals(bookTagCreate.idempotent, false);
});
