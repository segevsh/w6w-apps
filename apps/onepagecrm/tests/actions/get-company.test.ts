import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import getCompany from "../../actions/get-company.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("get-company: GET /companies/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ company: { id: "co1", name: "Acme" } }) }]);
  const out = await getCompany.execute({ companyId: "co1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v3/companies/co1");
  assertEquals(out.company, { id: "co1", name: "Acme" });
});

test("get-company: a non-envelope 200 body is refused", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  await assertRejects(() => Promise.resolve(getCompany.execute({ companyId: "co1" }, ctx)), Error);
});
