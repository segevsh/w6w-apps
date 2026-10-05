import { assert, assertEquals, assertRejects } from "@std/assert";
import cancelOrder from "../../actions/cancel-order.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = { "orderData": "od", "orderPspReference": "1" } as Parameters<
  typeof cancelOrder.execute
>[0];

Deno.test("cancel-order: sends POST to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "pspReference": "2", "resultCode": "Received" },
  }]);
  const out = await cancelOrder.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/orders/cancel");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "merchantAccount": "TestMerchant",
    "order": { "orderData": "od", "pspReference": "1" },
  });
  assertEquals(out, { "pspReference": "2", "resultCode": "Received" });
});

Deno.test("cancel-order: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "pspReference": "2", "resultCode": "Received" },
  }], "live");
  await cancelOrder.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("cancel-order: surfaces Adyen's error code, type and message", async () => {
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
    () => Promise.resolve(cancelOrder.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("cancel-order: sends the invocation id as Idempotency-Key", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "pspReference": "2", "resultCode": "Received" },
  }]);
  ctx.invocation = { invocationId: "inv-123" } as typeof ctx.invocation;
  await cancelOrder.execute(INPUT, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-123");
});

Deno.test("cancel-order: declares idempotency as false", () => {
  assertEquals(cancelOrder.idempotent, false);
});

Deno.test("cancel-order: an explicit merchantAccount beats the connection's", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "pspReference": "2", "resultCode": "Received" },
  }]);
  await cancelOrder.execute({ ...INPUT, merchantAccount: "OtherMerchant" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "null").merchantAccount, "OtherMerchant");
});
