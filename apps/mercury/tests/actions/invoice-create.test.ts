import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import invoiceCreate from "../../actions/invoice-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const BASE_INPUT = {
  customerId: "cust_1",
  destinationAccountId: "acc_1",
  dueDate: "2026-12-31",
  invoiceDate: "2026-11-01",
  lineItems: [{ name: "Consulting", unitPrice: 100, quantity: 2 }],
  sendEmailNow: false,
  achDebitEnabled: false,
  creditCardEnabled: false,
  useRealAccountNumber: false,
};

test("invoice-create: POSTs /ar/invoices with the required fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "inv_new" } }]);
  await invoiceCreate.execute(BASE_INPUT, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/ar/invoices");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.customerId, "cust_1");
  assertEquals(body.lineItems, [{ name: "Consulting", unitPrice: 100, quantity: 2 }]);
  assertEquals(body.ccEmails, []);
});

test("invoice-create: defaults sendEmailOption to DontSend, never emailing a real customer by accident", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await invoiceCreate.execute(BASE_INPUT, ctx);
  assertEquals(JSON.parse(calls[0].body!).sendEmailOption, "DontSend");
});

test("invoice-create: sendEmailNow true maps to SendNow", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await invoiceCreate.execute({ ...BASE_INPUT, sendEmailNow: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).sendEmailOption, "SendNow");
});

test("invoice-create: declares idempotent false — no vendor idempotency mechanism, and it can email the customer", () => {
  assertEquals(invoiceCreate.idempotent, false);
});
