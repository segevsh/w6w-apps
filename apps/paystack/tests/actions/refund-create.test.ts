import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/refund-create.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("refund-create: a full refund sends only the transaction", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ id: 1, status: "pending" }) }]);
  assertEquals(await action.execute({ transaction: "ref1" }, ctx), { id: 1, status: "pending" });
  assertEquals(pathOf(calls[0].url), "/refund");
  assertEquals(JSON.parse(calls[0].body!), { transaction: "ref1" });
});

Deno.test("refund-create: a partial refund sends amount, currency and notes", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ id: 2 }) }]);
  await action.execute({
    transaction: "ref1",
    amount: 2500,
    currency: "NGN",
    customerNote: "sorry",
    merchantNote: "damaged",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    transaction: "ref1",
    amount: 2500,
    currency: "NGN",
    customer_note: "sorry",
    merchant_note: "damaged",
  });
});

Deno.test("refund-create: rejects a non-integer amount and a missing transaction", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ transaction: "r", amount: 1.5 }, ctx),
    Error,
    "Amount",
  );
  await assertRejects(
    async () => await action.execute({ transaction: "r", amount: -1 }, ctx),
    Error,
    "Amount",
  );
  await assertRejects(
    async () => await action.execute({ transaction: "" }, ctx),
    Error,
    "Transaction is required",
  );
  assertEquals(calls.length, 0);
  assertEquals(action.idempotent, false);
});
