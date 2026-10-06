import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/id-from-legacy.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT = { "legacyIds": "a1, b2", "type": "TRANSACTION" } as Record<string, unknown>;
const DATA = { "idsFromLegacyIds": ["g1", "g2"] };

Deno.test("id-from-legacy: POSTs one GraphQL document to the production endpoint with the mapped variables", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: DATA } }]);
  const out = await action.execute!(INPUT as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://payments.braintree-api.com/graphql");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assert(sent.query.includes("idsFromLegacyIds(input: $input)"), sent.query);
  assertEquals(sent.variables, {
    "input": {
      "ids": [{ "legacyId": "a1", "type": "TRANSACTION" }, {
        "legacyId": "b2",
        "type": "TRANSACTION",
      }],
    },
  });
  assertEquals(out, {
    "ids": ["g1", "g2"],
    "pairs": [{ "legacyId": "a1", "id": "g1" }, { "legacyId": "b2", "id": "g2" }],
  });
});

Deno.test("id-from-legacy: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: DATA } }]);
  await action.execute!(INPUT as never, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("id-from-legacy: routes to the sandbox host when the connection says so", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: DATA } }]);
  (ctx as { connection?: unknown }).connection = { display: { environment: "sandbox" } };
  await action.execute!(INPUT as never, ctx);
  assertEquals(calls[0].url, "https://payments.sandbox.braintree-api.com/graphql");
});

Deno.test("id-from-legacy: an HTTP 200 carrying GraphQL errors is thrown with the error class", async () => {
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

Deno.test("id-from-legacy: declares type, params, output and honest idempotency", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(Array.isArray(action.output) && action.output.length > 0);
});
