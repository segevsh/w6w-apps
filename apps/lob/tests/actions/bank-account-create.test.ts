import { assert, assertEquals, assertRejects } from "@std/assert";
import bankAccountCreate from "../../actions/bank-account-create.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bank-account-create: POSTs the account and strips the number from the response", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "bank_1",
      account_number: "123456789",
      routing_number: "322271627",
      verified: false,
      microdeposit_type: "amounts",
    },
  }]);
  const out = await bankAccountCreate.execute({
    routingNumber: "322271627",
    accountNumber: "123456789",
    accountType: "company",
    signatory: "Jane Doe",
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/bank_accounts");
  assertEquals(bodyOf(calls[0]), {
    routing_number: "322271627",
    account_number: "123456789",
    account_type: "company",
    signatory: "Jane Doe",
  });
  assertEquals(out.id, "bank_1");
  assertEquals(out.microdeposit_type, "amounts");
  assertEquals("account_number" in out, false);
  assert(!JSON.stringify(out).includes("123456789"));
});

Deno.test("bank-account-create: is declared non-idempotent", () => {
  assertEquals(bankAccountCreate.idempotent, false);
});

Deno.test("bank-account-create: the account number is a secret field", () => {
  const field = bankAccountCreate.params!.find((p) => p.key === "accountNumber");
  assertEquals(field?.type, "secret");
});

Deno.test("bank-account-create: a bad routing number surfaces Lob's error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("invalid", "routing_number is invalid", 422),
  }]);
  await assertRejects(
    async () =>
      await bankAccountCreate.execute({
        routingNumber: "1",
        accountNumber: "2",
        accountType: "company",
        signatory: "x",
      }, ctx),
    Error,
    "invalid",
  );
});
