import { assertEquals } from "@std/assert";
import listMandates from "../../actions/list-mandates.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const page = listEnvelope("mandates", [{ id: "MD1", status: "active" }], { after: "C2" });

Deno.test("list-mandates: GET /mandates and the shared cursor output", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  const out = await listMandates.execute!({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/mandates");
  assertEquals(out.items.length, 1);
  assertEquals(out.afterCursor, "C2");
});

Deno.test("list-mandates: each filter maps to the vendor's own snake_case query key", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  await listMandates.execute!({
    customer: "CU1",
    creditor: "CR1",
    customerBankAccount: "BA1",
    status: "active",
    scheme: "bacs",
    mandateType: "recurring",
    reference: "INV-1042",
    createdAtGt: "2026-01-01T00:00:00Z",
    createdAtLte: "2026-02-01T00:00:00Z",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    customer: "CU1",
    creditor: "CR1",
    customer_bank_account: "BA1",
    status: "active",
    scheme: "bacs",
    mandate_type: "recurring",
    reference: "INV-1042",
    "created_at[gt]": "2026-01-01T00:00:00Z",
    "created_at[lte]": "2026-02-01T00:00:00Z",
  });
});
