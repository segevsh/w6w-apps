import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/transfer-recipient-create.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("transfer-recipient-create: POSTs /transferrecipient with snake_case fields", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ recipient_code: "RCP_1" }) }]);
  const out = await action.execute({
    type: "nuban",
    name: "Ada",
    accountNumber: "0001234567",
    bankCode: "058",
    currency: "NGN",
  }, ctx);
  assertEquals(out, { recipient_code: "RCP_1" });
  assertEquals(pathOf(calls[0].url), "/transferrecipient");
  assertEquals(JSON.parse(calls[0].body!), {
    type: "nuban",
    name: "Ada",
    account_number: "0001234567",
    bank_code: "058",
    currency: "NGN",
  });
});

Deno.test("transfer-recipient-create: every required field is checked locally", async () => {
  const { ctx, calls } = mockCtx([]);
  const full = { type: "nuban", name: "A", accountNumber: "1", bankCode: "058" };
  for (
    const [k, label] of [["type", "Type"], ["name", "Recipient name"], [
      "accountNumber",
      "Account number",
    ], ["bankCode", "Bank code"]]
  ) {
    await assertRejects(async () => await action.execute({ ...full, [k]: "" }, ctx), Error, label);
  }
  assertEquals(calls.length, 0);
});
