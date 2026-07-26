import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-search.ts";

Deno.test("customer-search: GETs /customers/search with the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], has_more: false } }]);
  await action.execute({ query: "email:'a@b.test'" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/customers/search");
  assertEquals(new URL(calls[0].url).searchParams.get("query"), "email:'a@b.test'");
});

Deno.test("customer-search: warns that the search index lags writes", () => {
  assert(action.description?.includes("lags writes"));
});
