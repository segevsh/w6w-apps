import { assertEquals } from "@std/assert";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/search.ts";

Deno.test("search: GETs v1/search with mapped params", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: { results: [], total_count: 0, count: 0 } }]);
  await action.execute({
    query: "budget",
    folder: "/Shared",
    type: "FILE",
    modifiedAfter: "2026-01-01T00:00:00Z",
    modifiedBefore: "2026-02-01T00:00:00Z",
    sortBy: "name",
    sortDirection: "ascending",
    count: 10,
    offset: 20,
  }, ctx);
  const u = new URL(calls[0].url);
  assertEquals(u.pathname, "/pubapi/v1/search");
  assertEquals(Object.fromEntries(u.searchParams), {
    query: "budget",
    folder: "/Shared",
    type: "FILE",
    modified_after: "2026-01-01T00:00:00Z",
    modified_before: "2026-02-01T00:00:00Z",
    sort_by: "name",
    sort_direction: "ascending",
    count: "10",
    offset: "20",
  });
});

Deno.test("search: only the query is sent by default", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: { results: [] } }]);
  assertEquals(await action.execute({ query: "abc" }, ctx), { results: [] });
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/search?query=abc");
});
