import { assert, assertEquals, assertRejects } from "@std/assert";
import submitPaymentDetails from "../../actions/submit-payment-details.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = { "details": '{"redirectResult":"X"}', "paymentData": "pd" } as Parameters<
  typeof submitPaymentDetails.execute
>[0];

Deno.test("submit-payment-details: sends POST to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "resultCode": "Authorised", "pspReference": "851" },
  }]);
  const out = await submitPaymentDetails.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/payments/details");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "paymentData": "pd",
    "details": { "redirectResult": "X" },
  });
  assertEquals(out, { "resultCode": "Authorised", "pspReference": "851" });
});

Deno.test("submit-payment-details: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "resultCode": "Authorised", "pspReference": "851" },
  }], "live");
  await submitPaymentDetails.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("submit-payment-details: surfaces Adyen's error code, type and message", async () => {
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
    () => Promise.resolve(submitPaymentDetails.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("submit-payment-details: sends the invocation id as Idempotency-Key", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "resultCode": "Authorised", "pspReference": "851" },
  }]);
  ctx.invocation = { invocationId: "inv-123" } as typeof ctx.invocation;
  await submitPaymentDetails.execute(INPUT, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-123");
});

Deno.test("submit-payment-details: declares idempotency as false", () => {
  assertEquals(submitPaymentDetails.idempotent, false);
});
