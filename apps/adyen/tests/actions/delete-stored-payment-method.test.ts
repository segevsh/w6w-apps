import { assert, assertEquals, assertRejects } from "@std/assert";
import deleteStoredPaymentMethod from "../../actions/delete-stored-payment-method.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = { "storedPaymentMethodId": "tok 1", "shopperReference": "s-1" } as Parameters<
  typeof deleteStoredPaymentMethod.execute
>[0];

Deno.test("delete-stored-payment-method: sends DELETE to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{ status: 204 }]);
  const out = await deleteStoredPaymentMethod.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/storedPaymentMethods/tok%201");
  assertEquals(Object.fromEntries(new URL(calls[0].url).searchParams), {
    "merchantAccount": "TestMerchant",
    "shopperReference": "s-1",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "deleted": true, "storedPaymentMethodId": "tok 1" });
});

Deno.test("delete-stored-payment-method: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx([{ status: 204 }], "live");
  await deleteStoredPaymentMethod.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("delete-stored-payment-method: surfaces Adyen's error code, type and message", async () => {
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
    () => Promise.resolve(deleteStoredPaymentMethod.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("delete-stored-payment-method: declares idempotency as false", () => {
  assertEquals(deleteStoredPaymentMethod.idempotent, false);
});

Deno.test("delete-stored-payment-method: an explicit merchantAccount beats the connection's", async () => {
  const { ctx, calls } = connectionCtx([{ status: 204 }]);
  await deleteStoredPaymentMethod.execute({ ...INPUT, merchantAccount: "OtherMerchant" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("merchantAccount"), "OtherMerchant");
});
