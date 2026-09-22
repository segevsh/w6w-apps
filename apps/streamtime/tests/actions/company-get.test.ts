import { assertEquals } from "@std/assert";
import companyGet from "../../actions/company-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-get: reads GET /v2/companies/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2001, name: "Acme" } }]);
  const result = await companyGet.execute({ companyId: 2001 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/companies/2001");
  assertEquals(calls[0].method, "GET");
  assertEquals(result.name, "Acme");
});
