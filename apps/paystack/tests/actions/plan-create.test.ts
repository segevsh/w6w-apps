import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/plan-create.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("plan-create: POSTs the plan, keeping an explicit false/0", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ plan_code: "PLN_1" }) }]);
  const out = await action.execute({
    name: "Gold",
    amount: 50000,
    interval: "monthly",
    sendInvoices: false,
    invoiceLimit: 0,
  }, ctx);
  assertEquals(out, { plan_code: "PLN_1" });
  assertEquals(pathOf(calls[0].url), "/plan");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Gold",
    amount: 50000,
    interval: "monthly",
    send_invoices: false,
    invoice_limit: 0,
  });
});

Deno.test("plan-create: validates name, amount and interval locally", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ name: "", amount: 1, interval: "daily" }, ctx),
    Error,
    "Name",
  );
  await assertRejects(
    async () => await action.execute({ name: "x", amount: 0, interval: "daily" }, ctx),
    Error,
    "Amount",
  );
  await assertRejects(
    async () => await action.execute({ name: "x", amount: 1, interval: "" }, ctx),
    Error,
    "Interval",
  );
  assertEquals(calls.length, 0);
});
