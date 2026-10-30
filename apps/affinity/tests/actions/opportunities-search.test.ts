import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import opportunitiesSearch from "../../actions/opportunities-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("opportunities-search: calls GET /opportunities?term=", async () => {
  const { ctx, calls } = mockCtx([{ body: { opportunities: [], next_page_token: null } }]);
  await opportunitiesSearch.execute({ term: "affinity" }, ctx);
  assertEquals(pathOf(calls[0].url), "/opportunities");
  assertEquals(queryOf(calls[0].url).term, "affinity");
});
