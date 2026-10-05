import { assert, assertEquals, assertRejects } from "@std/assert";
import getPaymentLink from "../../actions/get-payment-link.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = { "linkId": "PL 1" } as Parameters<typeof getPaymentLink.execute>[0];

Deno.test("get-payment-link: sends GET to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{ status: 200, body: { "id": "PL 1", "status": "paid" } }]);
  const out = await getPaymentLink.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/paymentLinks/PL%201");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": "PL 1", "status": "paid" });
});

Deno.test("get-payment-link: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx(
    [{ status: 200, body: { "id": "PL 1", "status": "paid" } }],
    "live",
  );
  await getPaymentLink.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("get-payment-link: surfaces Adyen's error code, type and message", async () => {
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
    () => Promise.resolve(getPaymentLink.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("get-payment-link: is a read-only action", () => {
  assertEquals(getPaymentLink.type, "read");
});
