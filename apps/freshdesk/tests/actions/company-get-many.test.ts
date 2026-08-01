import { assertEquals } from "@std/assert";
import { mockFreshdeskCtx } from "../_helpers.ts";
import action from "../../actions/company-get-many.ts";

Deno.test("company-get-many: GETs /companies and wraps the array as { companies }", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: [{ id: 1 }] }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.freshdesk.com/api/v2/companies");
  assertEquals(out, { companies: [{ id: 1 }] });
});

Deno.test("company-get-many: passes pagination through as query params", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: [] }]);
  await action.execute({ page: 2, perPage: 50 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "50");
});
