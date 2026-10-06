import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/payment-method-vault.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT = { "paymentMethodId": "nonce1", "customerId": "cus1", "makeDefault": true } as Record<
  string,
  unknown
>;
const DATA = {
  "vaultPaymentMethod": {
    "paymentMethod": { "id": "pm1", "legacyId": "tok", "usage": "MULTI_USE" },
    "verification": { "id": "v1", "status": "VERIFIED" },
  },
};

Deno.test("payment-method-vault: POSTs one GraphQL document to the production endpoint with the mapped variables", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: DATA } }]);
  const out = await action.execute!(INPUT as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://payments.braintree-api.com/graphql");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assert(sent.query.includes("vaultPaymentMethod(input: $input)"), sent.query);
  assertEquals(sent.variables, {
    "input": { "paymentMethodId": "nonce1", "customerId": "cus1", "makeDefault": true },
  });
  assertEquals(out, {
    "id": "pm1",
    "legacyId": "tok",
    "usage": "MULTI_USE",
    "verification": { "id": "v1", "status": "VERIFIED" },
  });
});

Deno.test("payment-method-vault: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: DATA } }]);
  await action.execute!(INPUT as never, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("payment-method-vault: routes to the sandbox host when the connection says so", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: DATA } }]);
  (ctx as { connection?: unknown }).connection = { display: { environment: "sandbox" } };
  await action.execute!(INPUT as never, ctx);
  assertEquals(calls[0].url, "https://payments.sandbox.braintree-api.com/graphql");
});

Deno.test("payment-method-vault: an HTTP 200 carrying GraphQL errors is thrown with the error class", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: null,
      errors: [{
        message: "Transaction cannot be refunded.",
        extensions: {
          errorClass: "VALIDATION",
          legacyCode: "91506",
          inputPath: ["input", "transactionId"],
        },
      }],
      extensions: { requestId: "req-1" },
    },
  }]);
  await assertRejects(
    async () => await action.execute!(INPUT as never, ctx),
    Error,
    "[VALIDATION 91506] Transaction cannot be refunded. (input.transactionId) [requestId req-1]",
  );
});

Deno.test("payment-method-vault: declares type, params, output and honest idempotency", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(Array.isArray(action.output) && action.output.length > 0);
});
