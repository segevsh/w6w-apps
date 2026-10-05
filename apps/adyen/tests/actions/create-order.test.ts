import { assert, assertEquals, assertRejects } from "@std/assert";
import createOrder from "../../actions/create-order.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = { "reference": "ORD-1", "currency": "EUR", "value": 5000 } as Parameters<
  typeof createOrder.execute
>[0];

Deno.test("create-order: sends POST to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "pspReference": "1", "orderData": "od", "resultCode": "Success" },
  }]);
  const out = await createOrder.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/orders");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "merchantAccount": "TestMerchant",
    "reference": "ORD-1",
    "amount": { "currency": "EUR", "value": 5000 },
  });
  assertEquals(out, { "pspReference": "1", "orderData": "od", "resultCode": "Success" });
});

Deno.test("create-order: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "pspReference": "1", "orderData": "od", "resultCode": "Success" },
  }], "live");
  await createOrder.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("create-order: surfaces Adyen's error code, type and message", async () => {
  const { ctx } = connectionCtx([{
    status: 422,
    body: {
      status: 422,
      errorCode: "130",
      errorType: "validation",
      message: "Reference Missing",
      pspReference: "881",
    },
  }]);
  await assertRejects(
    () => Promise.resolve(createOrder.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("create-order: sends the invocation id as Idempotency-Key", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "pspReference": "1", "orderData": "od", "resultCode": "Success" },
  }]);
  ctx.invocation = { invocationId: "inv-123" } as typeof ctx.invocation;
  await createOrder.execute(INPUT, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-123");
});

Deno.test("create-order: declares idempotency as false", () => {
  assertEquals(createOrder.idempotent, false);
});

Deno.test("create-order: an explicit merchantAccount beats the connection's", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "pspReference": "1", "orderData": "od", "resultCode": "Success" },
  }]);
  await createOrder.execute({ ...INPUT, merchantAccount: "OtherMerchant" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "null").merchantAccount, "OtherMerchant");
});
