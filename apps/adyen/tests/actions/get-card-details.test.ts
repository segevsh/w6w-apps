import { assert, assertEquals, assertRejects } from "@std/assert";
import getCardDetails from "../../actions/get-card-details.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = { "encryptedCardNumber": "adyenjs_0_1", "supportedBrands": '["visa"]' } as Parameters<
  typeof getCardDetails.execute
>[0];

Deno.test("get-card-details: sends POST to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{ status: 200, body: { "brands": [{ "type": "visa" }] } }]);
  const out = await getCardDetails.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/cardDetails");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "merchantAccount": "TestMerchant",
    "encryptedCardNumber": "adyenjs_0_1",
    "supportedBrands": ["visa"],
  });
  assertEquals(out, { "brands": [{ "type": "visa" }] });
});

Deno.test("get-card-details: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx(
    [{ status: 200, body: { "brands": [{ "type": "visa" }] } }],
    "live",
  );
  await getCardDetails.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("get-card-details: surfaces Adyen's error code, type and message", async () => {
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
    () => Promise.resolve(getCardDetails.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("get-card-details: sends the invocation id as Idempotency-Key", async () => {
  const { ctx, calls } = connectionCtx([{ status: 200, body: { "brands": [{ "type": "visa" }] } }]);
  ctx.invocation = { invocationId: "inv-123" } as typeof ctx.invocation;
  await getCardDetails.execute(INPUT, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-123");
});

Deno.test("get-card-details: is a read-only action", () => {
  assertEquals(getCardDetails.type, "read");
});

Deno.test("get-card-details: an explicit merchantAccount beats the connection's", async () => {
  const { ctx, calls } = connectionCtx([{ status: 200, body: { "brands": [{ "type": "visa" }] } }]);
  await getCardDetails.execute({ ...INPUT, merchantAccount: "OtherMerchant" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "null").merchantAccount, "OtherMerchant");
});
