import { assert, assertEquals } from "@std/assert";
import { connected, formObject, mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/collect-payment.ts";

const ok = { status: 200, body: { invoice: { id: "inv_1" }, transaction: { id: "txn_1" } } };

Deno.test("collect-payment: is a NON-idempotent perform action", () => {
  assertEquals(action.key, "collect-payment");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "invoice");
  // A retry attempts a second charge. This App sends no idempotency key, so
  // claiming otherwise would be the most expensive lie in the pack.
  assertEquals(action.idempotent, false);
});

Deno.test("collect-payment: targets the INVOICE route, not the customer one", async () => {
  // `/customers/{id}/collect_payment` settles a balance across invoices; this
  // action is scoped to one invoice on purpose.
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ invoiceId: "inv_1" }, connected(ctx));
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/invoices/inv_1/collect_payment");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("collect-payment: collects the full amount due when no amount is given", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ invoiceId: "inv_1" }, connected(ctx));
  assertEquals(calls[0].body, "");
});

Deno.test("collect-payment: passes the amount through as an integer, unconverted", async () => {
  // 1000 is $10.00. Converting here would truncate someone's money.
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ invoiceId: "inv_1", amount: 1000 }, connected(ctx));
  assertEquals(formObject(calls[0].body), { amount: "1000" });
});

Deno.test("collect-payment: maps every documented option", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    invoiceId: "inv_1",
    amount: 500,
    paymentSourceId: "pm_1",
    authorizationTransactionId: "txn_auth",
    paymentInitiator: "merchant",
    comment: "dunning retry",
  }, connected(ctx));
  assertEquals(formObject(calls[0].body), {
    amount: "500",
    payment_source_id: "pm_1",
    authorization_transaction_id: "txn_auth",
    payment_initiator: "merchant",
    comment: "dunning retry",
  });
});

Deno.test("collect-payment: exposes payment_initiator for SCA handling", () => {
  assertEquals(optionValues(action, "paymentInitiator"), ["customer", "merchant"]);
});

Deno.test("collect-payment: logs the attempt without logging anything sensitive", async () => {
  const { ctx, logs } = mockCtx([ok]);
  await action.execute({ invoiceId: "inv_1", amount: 500 }, connected(ctx));
  assertEquals(logs.length, 1);
  assertEquals(logs[0].level, "info");
  assertEquals(logs[0].data, { invoiceId: "inv_1" });
});

Deno.test("collect-payment: returns the invoice and the transaction", async () => {
  assertEquals(
    (action.output as Array<{ key: string }>).map((o) => o.key),
    ["invoice", "transaction"],
  );
  const { ctx } = mockCtx([ok]);
  assertEquals(await action.execute({ invoiceId: "inv_1" }, connected(ctx)), ok.body);
});

Deno.test("collect-payment: the amount hint states the smallest-currency-unit convention", () => {
  const p = (action.params ?? []).find((p) => p.key === "amount")!;
  assert(/smallest unit/i.test(p.hint ?? ""));
});
