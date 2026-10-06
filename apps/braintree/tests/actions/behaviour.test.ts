import { assert, assertEquals, assertRejects } from "@std/assert";
import charge from "../../actions/transaction-charge.ts";
import capture from "../../actions/transaction-capture.ts";
import refund from "../../actions/transaction-refund.ts";
import reverse from "../../actions/transaction-reverse.ts";
import txGet from "../../actions/transaction-get.ts";
import pmGet from "../../actions/payment-method-get.ts";
import custGet from "../../actions/customer-get.ts";
import custSearch from "../../actions/customer-search.ts";
import idFromLegacy from "../../actions/id-from-legacy.ts";
import clientToken from "../../actions/client-token-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("charge: apiRequestKey defaults to the invocation id so a retry cannot double-charge", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { chargePaymentMethod: { transaction: { id: "t" } } } },
  }]);
  (ctx as { invocation?: unknown }).invocation = { invocationId: "inv-42" };
  await charge.execute!({ paymentMethodId: "pm", amount: "1.00" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.input.apiRequestKey, "inv-42");
});

Deno.test("charge: an explicit apiRequestKey beats the invocation id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { chargePaymentMethod: { transaction: { id: "t" } } } },
  }]);
  (ctx as { invocation?: unknown }).invocation = { invocationId: "inv-42" };
  await charge.execute!({ paymentMethodId: "pm", amount: "1.00", apiRequestKey: "mine" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.input.apiRequestKey, "mine");
});

Deno.test("charge: no key at all is sent when there is neither input nor invocation", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { chargePaymentMethod: { transaction: { id: "t" } } } },
  }]);
  await charge.execute!({ paymentMethodId: "pm", amount: "1.00" }, ctx);
  assert(!("apiRequestKey" in JSON.parse(calls[0].body!).variables.input));
});

Deno.test("charge: a numeric amount is sent as a string, never a JSON number", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { chargePaymentMethod: { transaction: { id: "t" } } } },
  }]);
  await charge.execute!({ paymentMethodId: "pm", amount: 10 as unknown as string }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.input.transaction.amount, "10");
});

Deno.test("charge: a null payload with no errors is reported, not returned as success", async () => {
  const { ctx } = mockCtx([{ body: { data: { chargePaymentMethod: null } } }]);
  await assertRejects(
    async () => await charge.execute!({ paymentMethodId: "pm", amount: "1.00" }, ctx),
    Error,
    "no data for chargePaymentMethod",
  );
});

Deno.test("charge: partial data next to an errors array is still a failure", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: { chargePaymentMethod: { transaction: { id: "t" } } },
      errors: [{ message: "boom", extensions: { errorClass: "INTERNAL" } }],
    },
  }]);
  await assertRejects(
    async () => await charge.execute!({ paymentMethodId: "pm", amount: "1.00" }, ctx),
    Error,
    "[INTERNAL] boom",
  );
});

Deno.test("charge: a non-JSON body is an error naming the HTTP status", async () => {
  const { ctx } = mockCtx([{
    status: 502,
    body: "<html>bad gateway</html>",
    headers: { "content-type": "text/html" },
  }]);
  await assertRejects(
    async () => await charge.execute!({ paymentMethodId: "pm", amount: "1.00" }, ctx),
    Error,
    "HTTP 502 with a non-JSON body",
  );
});

Deno.test("capture: with no amount, no transaction options are sent (full capture)", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { captureTransaction: { transaction: { id: "t" } } } },
  }]);
  await capture.execute!({ transactionId: "tx1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.input, { transactionId: "tx1" });
});

Deno.test("refund: with no amount, no refund options are sent (full refund)", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { refundTransaction: { refund: { id: "r" } } } },
  }]);
  await refund.execute!({ transactionId: "tx1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.input, { transactionId: "tx1" });
});

Deno.test("reverse: a Transaction reversal is reported as a void", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        reverseTransaction: {
          reversal: { __typename: "Transaction", id: "tx1", status: "VOIDED" },
        },
      },
    },
  }]);
  assertEquals(await reverse.execute!({ transactionId: "tx1" }, ctx), {
    kind: "void",
    id: "tx1",
    status: "VOIDED",
  });
});

Deno.test("get actions: a node that is not the requested type is a clear not-found", async () => {
  for (
    const [action, input, what] of [
      [txGet, { transactionId: "x" }, "transaction"],
      [pmGet, { paymentMethodId: "x" }, "payment method"],
      [custGet, { customerId: "x" }, "customer"],
    ] as const
  ) {
    const { ctx } = mockCtx([{ body: { data: { node: {} } } }]);
    await assertRejects(
      async () => await action.execute!(input as never, ctx),
      Error,
      `no ${what} found for id x`,
    );
  }
});

Deno.test("customer-search: an unset filter is never sent as an empty object", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { customers: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } } },
  }]);
  const out = await custSearch.execute!({ email: "a@b.co" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.input, { email: { is: "a@b.co" } });
  assertEquals(out, { customers: [], hasNextPage: false, endCursor: null });
});

Deno.test("id-from-legacy: rejects more than 50 ids and an empty list before calling the API", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await idFromLegacy.execute!({
        legacyIds: Array.from({ length: 51 }, (_, i) => `i${i}`),
        type: "CUSTOMER",
      }, ctx),
    Error,
    "between 1 and 50",
  );
  await assertRejects(
    async () => await idFromLegacy.execute!({ legacyIds: " , ", type: "CUSTOMER" }, ctx),
    Error,
  );
  assertEquals(calls.length, 0);
});

Deno.test("id-from-legacy: accepts a JSON array in text form", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { idsFromLegacyIds: ["g1"] } } }]);
  await idFromLegacy.execute!({ legacyIds: '["a1"]', type: "CUSTOMER" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.input.ids, [{
    legacyId: "a1",
    type: "CUSTOMER",
  }]);
});

Deno.test("client-token-create: with no scoping, an empty input is sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { createClientToken: { clientToken: "t" } } } }]);
  await clientToken.execute!({}, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, { input: {} });
});
