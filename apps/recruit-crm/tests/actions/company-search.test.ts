import { assertEquals } from "@std/assert";
import action from "../../actions/company-search.ts";
import { mockCtx, paginator, pathOf, queryOf } from "../_helpers.ts";

Deno.test("company-search: sends company_name to /companies/search", async () => {
  const { ctx, calls } = mockCtx([{ body: paginator([{ company_name: "Acme" }]) }]);
  const out = await action.execute({ companyName: "Acme" }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/companies/search");
  assertEquals(queryOf(calls[0].url), { company_name: "Acme" });
  assertEquals(out.items.length, 1);
});

Deno.test("company-search: a non-paginator answer degrades to an empty page", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await action.execute({ companyName: "x" }, ctx) as { count: number };
  assertEquals(out.count, 0);
});
