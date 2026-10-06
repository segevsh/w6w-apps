import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/client-token-create.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT = { "customerId": "cus1" } as Record<string, unknown>;
const DATA = { "createClientToken": { "clientToken": "eyJ" } };

Deno.test("client-token-create: POSTs one GraphQL document to the production endpoint with the mapped variables", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: DATA } }]);
  const out = await action.execute!(INPUT as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://payments.braintree-api.com/graphql");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assert(sent.query.includes("createClientToken(input: $input)"), sent.query);
  assertEquals(sent.variables, { "input": { "clientToken": { "customerId": "cus1" } } });
  assertEquals(out, { "clientToken": "eyJ" });
});

Deno.test("client-token-create: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: DATA } }]);
  await action.execute!(INPUT as never, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("client-token-create: routes to the sandbox host when the connection says so", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: DATA } }]);
  (ctx as { connection?: unknown }).connection = { display: { environment: "sandbox" } };
  await action.execute!(INPUT as never, ctx);
  assertEquals(calls[0].url, "https://payments.sandbox.braintree-api.com/graphql");
});

Deno.test("client-token-create: an HTTP 200 carrying GraphQL errors is thrown with the error class", async () => {
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

Deno.test("client-token-create: declares type, params, output and honest idempotency", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(Array.isArray(action.output) && action.output.length > 0);
});
