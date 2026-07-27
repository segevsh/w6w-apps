import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-get-many.ts";

Deno.test("company-get-many: GETs /companies with filters and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], pages: {} } }]);
  await action.execute!({ name: "Acme", page: 2, perPage: 30 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/companies");
  assertEquals(url.searchParams.get("name"), "Acme");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "30");
});

Deno.test("company-get-many: defaults per_page to 15 and omits blank filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("per_page"), "15");
  assertEquals(url.searchParams.has("name"), false);
  assertEquals(url.searchParams.has("company_id"), false);
});
