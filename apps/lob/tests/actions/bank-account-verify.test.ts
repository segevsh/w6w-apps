import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import bankAccountVerify from "../../actions/bank-account-verify.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

test("bank-account-verify: POSTs the amounts to the verify route", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "bank_1", verified: true, account_number: "123456789" },
  }]);
  const out = await bankAccountVerify.execute(
    { bankAccountId: "bank_1", amounts: "[11, 35]" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/bank_accounts/bank_1/verify");
  assertEquals(bodyOf(calls[0]), { amounts: [11, 35] });
  assertEquals(out.verified, true);
  assertEquals("account_number" in out, false);
});

test("bank-account-verify: a descriptor code is sent as descriptor_code", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "bank_1", verified: true } }]);
  await bankAccountVerify.execute({ bankAccountId: "bank_1", descriptorCode: "ABC123" }, ctx);
  assertEquals(bodyOf(calls[0]), { descriptor_code: "ABC123" });
});

test("bank-account-verify: bad input is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await bankAccountVerify.execute({ bankAccountId: "b" }, ctx),
    Error,
    "amounts or the descriptor",
  );
  await assertRejects(
    async () => await bankAccountVerify.execute({ bankAccountId: "b", amounts: [1] }, ctx),
    Error,
    "two integers",
  );
  await assertRejects(
    async () => await bankAccountVerify.execute({ bankAccountId: "b", amounts: [1.5, 2] }, ctx),
    Error,
    "two integers",
  );
  await assertRejects(
    async () =>
      await bankAccountVerify.execute(
        { bankAccountId: "b", amounts: [1, 2], descriptorCode: "x" },
        ctx,
      ),
    Error,
    "not both",
  );
  assertEquals(calls.length, 0);
});

test("bank-account-verify: wrong amounts surface Lob's error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("invalid", "amounts do not match", 422),
  }]);
  await assertRejects(
    async () => await bankAccountVerify.execute({ bankAccountId: "b", amounts: [1, 2] }, ctx),
    Error,
    "invalid",
  );
});
