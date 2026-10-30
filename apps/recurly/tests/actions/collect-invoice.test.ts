import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/collect-invoice.ts";

test("collect-invoice: is a non-idempotent perform action requiring invoiceId", () => {
  assertEquals(action.key, "collect-invoice");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  const p = (action.params ?? []).find((p) => p.key === "invoiceId")!;
  assertEquals(p.required, true);
});

test("collect-invoice: PUTs /invoices/{id}/collect", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "i1", state: "paid" } }]);
  await action.execute({ invoiceId: "i1", billingInfoId: "bi1" }, connected(ctx));
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/invoices/i1/collect");
  assertEquals(JSON.parse(calls[0].body ?? "{}").billing_info_id, "bi1");
});
