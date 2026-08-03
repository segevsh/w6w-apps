import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/search.ts";

Deno.test("search: GETs /advanced_search with the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute({ query: "onboarding" }, ctx);
  assertEquals(pathOf(calls[0]), "/api/admin/v2/advanced_search");
  assertEquals(queryOf(calls[0]), { query: ["onboarding"] });
});

Deno.test("search: forwards the type filter and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ query: "x", type: "members", page: 2, perPage: 25 }, ctx);
  assertEquals(queryOf(calls[0]), {
    query: ["x"],
    type: ["members"],
    page: ["2"],
    per_page: ["25"],
  });
});

Deno.test("search: offers the nine types Circle's enum declares", () => {
  const values = (action.params!.find((p) => p.key === "type")!.options as Array<{ value: string }>)
    .map((o) => o.value);
  assertEquals(values.sort(), [
    "comments",
    "entity_list",
    "events",
    "general",
    "lessons",
    "members",
    "mentions",
    "posts",
    "spaces",
  ]);
});

/**
 * `filters` is declared as a query-string OBJECT with further nested arrays,
 * and the parameter table does not pin down the bracket encoding for each
 * sub-key. Shipping a guessed serialisation would produce a filter that
 * silently does nothing — worse than not offering one.
 */
Deno.test("search: does not expose the unverifiable `filters` or `mention_scope` params", () => {
  const keys = action.params!.map((p) => p.key);
  assertEquals(keys, ["query", "type", "page", "perPage"]);
});
