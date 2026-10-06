import { assertEquals } from "@std/assert";
import paymentCreate from "../../actions/payment-create.ts";
import { alegraError, assertRejects, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-create: POST /payments with bank account/client refs and the invoice allocations", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "31", status: "open" } }]);
  const out = await paymentCreate.execute({
    date: "2026-10-02",
    bankAccountId: "1",
    paymentMethod: "transfer",
    type: "in",
    clientId: "20",
    invoices: [{ id: "6", amount: 150 }],
    observations: "obs",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/payments");
  assertEquals(bodyOf(calls[0]), {
    date: "2026-10-02",
    paymentMethod: "transfer",
    type: "in",
    observations: "obs",
    bankAccount: { id: "1" },
    client: { id: "20" },
    invoices: [{ id: "6", amount: 150 }],
  });
  assertEquals(out, { id: "31", status: "open" });
});

Deno.test("payment-create: bills given as JSON text are parsed; unset arrays are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await paymentCreate.execute({
    date: "2026-10-02",
    bankAccountId: "1",
    paymentMethod: "cash",
    type: "out",
    bills: '[{"id":"3","amount":80}]',
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.bills, [{ id: "3", amount: 80 }]);
  assertEquals("invoices" in body, false);
});

Deno.test("payment-create: bad JSON in invoices fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      paymentCreate.execute({
        date: "d",
        bankAccountId: "1",
        paymentMethod: "cash",
        invoices: "{",
      }, ctx),
    Error,
    "valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("payment-create: a 400 surfaces the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: alegraError(400, "saldo insuficiente") }]);
  await assertRejects(
    () => paymentCreate.execute({ date: "d", bankAccountId: "1", paymentMethod: "cash" }, ctx),
    Error,
    "saldo insuficiente",
  );
});
