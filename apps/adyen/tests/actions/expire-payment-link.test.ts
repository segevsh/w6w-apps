import { assert, assertEquals, assertRejects } from "@std/assert";
import expirePaymentLink from "../../actions/expire-payment-link.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = { "linkId": "PL1" } as Parameters<typeof expirePaymentLink.execute>[0];

Deno.test("expire-payment-link: sends PATCH to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "id": "PL1", "status": "expired" },
  }]);
  const out = await expirePaymentLink.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/paymentLinks/PL1");
  assertEquals(JSON.parse(calls[0].body ?? "null"), { "status": "expired" });
  assertEquals(out, { "id": "PL1", "status": "expired" });
});

Deno.test("expire-payment-link: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "id": "PL1", "status": "expired" },
  }], "live");
  await expirePaymentLink.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("expire-payment-link: surfaces Adyen's error code, type and message", async () => {
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
    () => Promise.resolve(expirePaymentLink.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("expire-payment-link: declares idempotency as true", () => {
  assertEquals(expirePaymentLink.idempotent, true);
});
