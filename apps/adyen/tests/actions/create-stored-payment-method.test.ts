import { assert, assertEquals, assertRejects } from "@std/assert";
import createStoredPaymentMethod from "../../actions/create-stored-payment-method.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = {
  "shopperReference": "s-1",
  "recurringProcessingModel": "Subscription",
  "paymentMethod": { "type": "scheme" },
} as Parameters<typeof createStoredPaymentMethod.execute>[0];

Deno.test("create-stored-payment-method: sends POST to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{ status: 201, body: { "id": "tok1", "brand": "visa" } }]);
  const out = await createStoredPaymentMethod.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/storedPaymentMethods");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "merchantAccount": "TestMerchant",
    "shopperReference": "s-1",
    "recurringProcessingModel": "Subscription",
    "paymentMethod": { "type": "scheme" },
  });
  assertEquals(out, { "id": "tok1", "brand": "visa" });
});

Deno.test("create-stored-payment-method: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx(
    [{ status: 201, body: { "id": "tok1", "brand": "visa" } }],
    "live",
  );
  await createStoredPaymentMethod.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("create-stored-payment-method: surfaces Adyen's error code, type and message", async () => {
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
    () => Promise.resolve(createStoredPaymentMethod.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("create-stored-payment-method: sends the invocation id as Idempotency-Key", async () => {
  const { ctx, calls } = connectionCtx([{ status: 201, body: { "id": "tok1", "brand": "visa" } }]);
  ctx.invocation = { invocationId: "inv-123" } as typeof ctx.invocation;
  await createStoredPaymentMethod.execute(INPUT, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-123");
});

Deno.test("create-stored-payment-method: declares idempotency as false", () => {
  assertEquals(createStoredPaymentMethod.idempotent, false);
});

Deno.test("create-stored-payment-method: an explicit merchantAccount beats the connection's", async () => {
  const { ctx, calls } = connectionCtx([{ status: 201, body: { "id": "tok1", "brand": "visa" } }]);
  await createStoredPaymentMethod.execute({ ...INPUT, merchantAccount: "OtherMerchant" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "null").merchantAccount, "OtherMerchant");
});
