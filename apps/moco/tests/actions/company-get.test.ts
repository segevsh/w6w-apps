import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockMocoCtx } from "../_helpers.ts";
import action from "../../actions/company-get.ts";

test("company-get: GETs /companies/:id", async () => {
  const { ctx, calls } = mockMocoCtx([{ body: { id: 5, type: "customer", name: "Beispiel AG" } }]);
  const out = await action.execute({ companyId: 5 }, ctx);
  assertEquals(calls[0].url, "https://acme.mocoapp.com/api/v1/companies/5");
  assertEquals(out, { id: 5, type: "customer", name: "Beispiel AG" });
});
