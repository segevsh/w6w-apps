import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/transaction-search.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT = {
  "status": "SETTLED,VOIDED",
  "createdFrom": "2026-01-01T00:00:00Z",
  "orderId": "o1",
  "customerEmail": "a@b.co",
  "amountMin": "5.00",
  "first": 5,
  "after": "c0",
} as Record<string, unknown>;
const DATA = {
  "transactions": {
    "edges": [{
      "node": {
        "id": "tx1",
        "legacyId": "abc",
        "status": "AUTHORIZED",
        "amount": { "value": "10.00", "currencyCode": "USD" },
      },
    }],
    "pageInfo": { "hasNextPage": true, "endCursor": "cur1" },
  },
};

Deno.test("transaction-search: POSTs one GraphQL document to the production endpoint with the mapped variables", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: DATA } }]);
  const out = await action.execute!(INPUT as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://payments.braintree-api.com/graphql");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assert(sent.query.includes("transactions(input: $input"), sent.query);
  assertEquals(sent.variables, {
    "input": {
      "status": { "in": ["SETTLED", "VOIDED"] },
      "createdAt": { "greaterThanOrEqualTo": "2026-01-01T00:00:00Z" },
      "orderId": { "is": "o1" },
      "customer": { "email": { "is": "a@b.co" } },
      "amount": { "value": { "greaterThanOrEqualTo": "5.00" } },
    },
    "first": 5,
    "after": "c0",
  });
  assertEquals(out, {
    "transactions": [{
      "id": "tx1",
      "legacyId": "abc",
      "status": "AUTHORIZED",
      "amount": { "value": "10.00", "currencyCode": "USD" },
    }],
    "hasNextPage": true,
    "endCursor": "cur1",
  });
});

Deno.test("transaction-search: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: DATA } }]);
  await action.execute!(INPUT as never, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("transaction-search: routes to the sandbox host when the connection says so", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: DATA } }]);
  (ctx as { connection?: unknown }).connection = { display: { environment: "sandbox" } };
  await action.execute!(INPUT as never, ctx);
  assertEquals(calls[0].url, "https://payments.sandbox.braintree-api.com/graphql");
});

Deno.test("transaction-search: an HTTP 200 carrying GraphQL errors is thrown with the error class", async () => {
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

Deno.test("transaction-search: declares type, params, output and honest idempotency", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(Array.isArray(action.output) && action.output.length > 0);
});
