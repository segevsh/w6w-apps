import { assertEquals } from "@std/assert";
import search from "../../actions/search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("search: calls GET /search with the query and entity types", async () => {
  const { ctx, calls } = mockCtx([{ body: { stories: { data: [], next: null, total: 0 } } }]);
  await search.execute(
    { query: "is:story owner:jane", entityTypes: ["story"], pageSize: 25 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v3/search");
  assertEquals(queryOf(calls[0].url), {
    query: "is:story owner:jane",
    entity_types: "story",
    page_size: "25",
  });
});

/**
 * `next` is a full path+query string from a previous response. This action
 * must reuse it directly rather than re-deriving a query from the other
 * params, and must not double the `/api/v3` prefix the client already adds.
 */
Deno.test("search: a next cursor is followed directly, without re-adding the API prefix", async () => {
  const { ctx, calls } = mockCtx([{ body: { stories: { data: [], next: null, total: 0 } } }]);
  await search.execute(
    { query: "ignored", next: "/api/v3/search?query=is%3Astory&next=abc123" },
    ctx,
  );

  assertEquals(
    calls[0].url,
    "https://api.app.shortcut.com/api/v3/search?query=is%3Astory&next=abc123",
  );
});

Deno.test("search: a next cursor without the /api/v3 prefix still works", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await search.execute({ query: "ignored", next: "/search?next=abc123" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3/search");
  assertEquals(queryOf(calls[0].url), { next: "abc123" });
});
