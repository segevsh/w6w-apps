import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, mockPayPalCtx } from "../_helpers.ts";
import { baseUrl, compact, PayPalClient, sandboxFromConnection, unset } from "../../lib/client.ts";

Deno.test("client: builds the URL from the live host by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ORD-1" } }]);
  await new PayPalClient(ctx).request("/v2/checkout/orders/1");
  assertEquals(calls[0].url, "https://api-m.paypal.com/v2/checkout/orders/1");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: uses the sandbox host when the connection recorded sandbox=true", async () => {
  const { ctx, calls } = mockPayPalCtx([{ body: {} }], true);
  await new PayPalClient(ctx).request("/v2/checkout/orders/1");
  assertEquals(calls[0].url, "https://api-m.sandbox.paypal.com/v2/checkout/orders/1");
});

Deno.test("client: surfaces PayPal's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    statusText: "Unprocessable Entity",
    body: '{"name":"UNPROCESSABLE_ENTITY","message":"bad value"}',
  }]);
  await assertRejects(
    () => new PayPalClient(ctx).request("/v2/checkout/orders", { method: "POST", body: {} }),
    Error,
    "bad value",
  );
});

Deno.test("client: returns undefined for a 204", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(
    await new PayPalClient(ctx).request("/v1/payments/payouts-item/x/cancel", { method: "POST" }),
    undefined,
  );
});

Deno.test("sandboxFromConnection: reads the display data afterConnect records", () => {
  assertEquals(sandboxFromConnection({ display: { sandbox: true } } as never), true);
  assertEquals(sandboxFromConnection({ display: { sandbox: false } } as never), false);
  assertEquals(sandboxFromConnection(undefined), false);
});

Deno.test("baseUrl: picks live vs sandbox", () => {
  assertEquals(baseUrl(false), "https://api-m.paypal.com");
  assertEquals(baseUrl(true), "https://api-m.sandbox.paypal.com");
});

Deno.test("compact/unset behave as the other apps' helpers do", () => {
  assertEquals(compact({ a: 0, b: undefined, c: null, d: "", e: "x" }), { a: 0, e: "x" });
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});
