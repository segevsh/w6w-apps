import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/transaction-initialize.ts";
import { errorBody, mockCtx, ok, pathOf } from "../_helpers.ts";

const DATA = {
  authorization_url: "https://checkout.paystack.com/abc",
  access_code: "abc",
  reference: "r1",
};

Deno.test("transaction-initialize: POSTs the snake_case body and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: ok(DATA) }]);
  const out = await action.execute({
    email: "a@b.co",
    amount: 500000,
    currency: "NGN",
    reference: "r1",
    callbackUrl: "https://x.test/cb",
    channels: "card, bank",
    metadata: { order: 7 },
  }, ctx);
  assertEquals(out, DATA);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/transaction/initialize");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "a@b.co",
    amount: 500000,
    currency: "NGN",
    reference: "r1",
    callback_url: "https://x.test/cb",
    channels: ["card", "bank"],
    metadata: { order: 7 },
  });
  assertEquals(calls[0].headers.authorization, undefined, "credentials belong to sign");
});

Deno.test("transaction-initialize: rejects a bad amount or email without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  for (const amount of [0, -5, 10.5, NaN]) {
    await assertRejects(
      async () => await action.execute({ email: "a@b.co", amount }, ctx),
      Error,
      "Amount",
    );
  }
  await assertRejects(
    async () => await action.execute({ email: " ", amount: 100 }, ctx),
    Error,
    "email",
  );
  assertEquals(calls.length, 0);
});

Deno.test("transaction-initialize: surfaces the vendor's message and code on a failure", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("Duplicate Transaction Reference", "api_error", "api_error"),
  }]);
  const err = await assertRejects(async () =>
    await action.execute({ email: "a@b.co", amount: 100 }, ctx)
  );
  assert(String(err).includes("Duplicate Transaction Reference"));
  assert(String(err).includes("400"));
});

Deno.test("transaction-initialize: is declared non-idempotent", () => {
  assertEquals(action.idempotent, false);
  assertEquals(action.type, "perform");
});
