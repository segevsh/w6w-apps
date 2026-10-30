import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import companyUpdate from "../../actions/company-update.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

test("company-update: posts id and changed fields, parsing customFields JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "co1" } }]);
  const out = await companyUpdate.execute(
    { id: "co1", name: "Acme, Inc.", monthlySpend: 1000, customFields: '{"plan":"Premium"}' },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].url, "https://canny.io/api/v1/companies/update");
  assertEquals(bodyOf(calls[0]), {
    id: "co1",
    name: "Acme, Inc.",
    monthlySpend: 1000,
    customFields: { plan: "Premium" },
  });
  assertEquals(out.id, "co1");
});

test("company-update: is idempotent", () => {
  assertEquals(companyUpdate.idempotent, true);
});
