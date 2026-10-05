import { assert, assertEquals, assertRejects } from "@std/assert";
import listStoredPaymentMethods from "../../actions/list-stored-payment-methods.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = { "shopperReference": "shopper-1" } as Parameters<
  typeof listStoredPaymentMethods.execute
>[0];

Deno.test("list-stored-payment-methods: sends GET to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "storedPaymentMethods": [{ "id": "tok1" }] },
  }]);
  const out = await listStoredPaymentMethods.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/storedPaymentMethods");
  assertEquals(Object.fromEntries(new URL(calls[0].url).searchParams), {
    "merchantAccount": "TestMerchant",
    "shopperReference": "shopper-1",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "storedPaymentMethods": [{ "id": "tok1" }] });
});

Deno.test("list-stored-payment-methods: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "storedPaymentMethods": [{ "id": "tok1" }] },
  }], "live");
  await listStoredPaymentMethods.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("list-stored-payment-methods: surfaces Adyen's error code, type and message", async () => {
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
    () => Promise.resolve(listStoredPaymentMethods.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("list-stored-payment-methods: is a read-only action", () => {
  assertEquals(listStoredPaymentMethods.type, "read");
});

Deno.test("list-stored-payment-methods: an explicit merchantAccount beats the connection's", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "storedPaymentMethods": [{ "id": "tok1" }] },
  }]);
  await listStoredPaymentMethods.execute({ ...INPUT, merchantAccount: "OtherMerchant" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("merchantAccount"), "OtherMerchant");
});
