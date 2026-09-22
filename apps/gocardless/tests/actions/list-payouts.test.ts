import { assertEquals } from "@std/assert";
import listPayouts from "../../actions/list-payouts.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const page = listEnvelope("payouts", [{ id: "PO1", amount: 5000, status: "paid" }]);

Deno.test("list-payouts: GET /payouts", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  const out = await listPayouts.execute!({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/payouts");
  assertEquals(out.items.length, 1);
});

Deno.test("list-payouts: every documented filter maps to its own query key", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  await listPayouts.execute!({
    creditor: "CR1",
    creditorBankAccount: "BA1",
    currency: "GBP",
    status: "paid",
    reference: "INV-1042",
    payoutType: "merchant",
    createdAtGte: "2026-09-01T00:00:00Z",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    creditor: "CR1",
    creditor_bank_account: "BA1",
    currency: "GBP",
    status: "paid",
    reference: "INV-1042",
    payout_type: "merchant",
    "created_at[gte]": "2026-09-01T00:00:00Z",
  });
});
