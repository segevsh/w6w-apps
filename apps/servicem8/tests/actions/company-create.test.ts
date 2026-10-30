import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import companyCreate from "../../actions/company-create.ts";
import { bodyOf, mockCtx, pathOf, result } from "../_helpers.ts";

test("company-create: POSTs to /company.json and returns only the uuid header", async () => {
  const { ctx, calls } = mockCtx([{ body: result(), headers: { "x-record-uuid": "new-c1" } }]);
  const out = await companyCreate.execute({ name: "Acme Plumbing", isIndividual: false }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api_1.0/company.json");
  assertEquals(bodyOf(calls[0]), { name: "Acme Plumbing", is_individual: 0 });
  assertEquals(out, { uuid: "new-c1" });
});

test("company-create: is not marked idempotent", () => {
  assertEquals(companyCreate.idempotent, false);
});
