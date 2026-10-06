import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/transaction-partial-capture.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT = { "transactionId": "tx1", "amount": "4.00", "finalCapture": true } as Record<
  string,
  unknown
>;
const DATA = {
  "partialCaptureTransaction": {
    "capture": {
      "id": "tx1",
      "legacyId": "abc",
      "status": "AUTHORIZED",
      "amount": { "value": "10.00", "currencyCode": "USD" },
    },
  },
};

Deno.test("transaction-partial-capture: POSTs one GraphQL document to the production endpoint with the mapped variables", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: DATA } }]);
  const out = await action.execute!(INPUT as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://payments.braintree-api.com/graphql");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assert(sent.query.includes("partialCaptureTransaction(input: $input)"), sent.query);
  assertEquals(sent.variables, {
    "input": { "transactionId": "tx1", "transaction": { "amount": "4.00", "finalCapture": true } },
  });
  assertEquals(out, {
    "id": "tx1",
    "legacyId": "abc",
    "status": "AUTHORIZED",
    "amount": { "value": "10.00", "currencyCode": "USD" },
  });
});

Deno.test("transaction-partial-capture: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: DATA } }]);
  await action.execute!(INPUT as never, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("transaction-partial-capture: routes to the sandbox host when the connection says so", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: DATA } }]);
  (ctx as { connection?: unknown }).connection = { display: { environment: "sandbox" } };
  await action.execute!(INPUT as never, ctx);
  assertEquals(calls[0].url, "https://payments.sandbox.braintree-api.com/graphql");
});

Deno.test("transaction-partial-capture: an HTTP 200 carrying GraphQL errors is thrown with the error class", async () => {
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

Deno.test("transaction-partial-capture: declares type, params, output and honest idempotency", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(Array.isArray(action.output) && action.output.length > 0);
  assertEquals(action.idempotent, true);
});
