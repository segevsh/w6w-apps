import { assertEquals } from "@std/assert";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/customer-search.ts";

Deno.test("customer-search: GETs /customers/search.json", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { customers: [] } }]);
  await action.execute({ query: "email:jo@acme.test" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/admin/api/2024-07/customers/search.json");
  assertEquals(new URL(calls[0].url).searchParams.get("query"), "email:jo@acme.test");
});
