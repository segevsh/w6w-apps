import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-get.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

test("company-get: GETs /companies/{id} and unwraps the `company` envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { company: { id: 1 } } }], conn);
  const out = await action.execute!({ companyId: 1 }, ctx);
  assertEquals(calls[0].url, "https://mautic.example.com/api/companies/1");
  assertEquals(out, { id: 1 });
});
