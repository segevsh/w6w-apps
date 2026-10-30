import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import companyGet from "../../actions/company-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("company-get: GETs /company", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1", name: "Acme" } }]);
  const out = await companyGet.execute({}, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/api/v2/company");
  assertEquals(out.name, "Acme");
});
