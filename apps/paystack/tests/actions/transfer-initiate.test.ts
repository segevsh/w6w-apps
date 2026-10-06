import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/transfer-initiate.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("transfer-initiate: POSTs /transfer from the balance by default", async () => {
  const data = { transfer_code: "TRF_1", status: "success" };
  const { ctx, calls } = mockCtx([{ body: ok(data) }]);
  const out = await action.execute({
    amount: 3000,
    recipient: "RCP_1",
    reference: "ref-0123456789abcdef",
    reason: "payout",
    currency: "NGN",
  }, ctx);
  assertEquals(out, data);
  assertEquals(pathOf(calls[0].url), "/transfer");
  assertEquals(JSON.parse(calls[0].body!), {
    source: "balance",
    amount: 3000,
    recipient: "RCP_1",
    reference: "ref-0123456789abcdef",
    reason: "payout",
    currency: "NGN",
  });
  assertEquals(action.idempotent, false);
});

Deno.test("transfer-initiate: refuses a bad amount or missing recipient before any money moves", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ amount: 0, recipient: "RCP_1" }, ctx),
    Error,
    "Amount",
  );
  await assertRejects(
    async () => await action.execute({ amount: 1.5, recipient: "RCP_1" }, ctx),
    Error,
    "Amount",
  );
  await assertRejects(
    async () => await action.execute({ amount: 10, recipient: "" }, ctx),
    Error,
    "Recipient code",
  );
  assertEquals(calls.length, 0);
});
