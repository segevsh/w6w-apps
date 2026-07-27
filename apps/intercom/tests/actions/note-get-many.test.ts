import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/note-get-many.ts";

Deno.test("note-get-many: GETs /contacts/{id}/notes with pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], pages: {} } }]);
  await action.execute!({ contactId: "abc", page: 1, perPage: 20 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/contacts/abc/notes");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.get("per_page"), "20");
  assertEquals(calls[0].method, "GET");
});
