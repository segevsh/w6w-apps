import { assertEquals } from "@std/assert";
import action from "../../actions/note-search.ts";
import { bodyOf, listEnvelope, mockCtx, pathOf, queryAll, queryOf } from "../_helpers.ts";

/** v1's `term` parameter became `data.search.query` here. */
Deno.test("note-search: the full-text query goes into the body's search.query", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "n-1" }]) }]);
  const out = await action.execute({ query: "checkout is slow" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/notes/search");
  assertEquals(bodyOf(calls[0]), { data: { search: { query: "checkout is slow" } } });
  assertEquals(out.items.length, 1);
  // Not a query-string parameter — v1's `term` has no v2 equivalent on the URL.
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("note-search: an empty query sends no search key at all", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ filter: { type: ["textNote"] } }, ctx);
  assertEquals(bodyOf(calls[0]), { data: { filter: { type: ["textNote"] } } });
});

/**
 * The bracketed spelling here, against the unbracketed one on GET /v2/notes.
 * Both are the vendor's, and both are pinned so a future tidy-up cannot
 * silently swap one for the other.
 */
Deno.test("note-search: the response-field selector IS bracketed on this endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ fields: "name,content", pageCursor: "cur" }, ctx);
  assertEquals(queryAll(calls[0].url, "fields[]"), ["name", "content"]);
  assertEquals(queryOf(calls[0].url).pageCursor, "cur");
});

Deno.test("note-search: return fields become the body's return.fields", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ returnFields: "name , owner" }, ctx);
  assertEquals(bodyOf(calls[0]), { data: { return: { fields: ["name", "owner"] } } });
});
