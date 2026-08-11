import { assert, assertEquals } from "@std/assert";
import cartCreate from "../../actions/cart-create.ts";
import { bodyOf, mockCtx, pathOf, queryOf, v3Envelope } from "../_helpers.ts";

Deno.test("cart-create: POSTs line items and asks for the redirect URLs by default", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: v3Envelope({ id: "cart-1", redirect_urls: { checkout_url: "https://…" } }),
  }]);
  const out = await cartCreate.execute({ lineItems: [{ product_id: 77, quantity: 1 }] }, ctx) as {
    id: string;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/carts");
  assertEquals(bodyOf(calls[0]), { line_items: [{ product_id: 77, quantity: 1 }] });
  assertEquals(out.id, "cart-1");

  const include = cartCreate.params?.find((p) => p.key === "include");
  assertEquals(include?.default, ["redirect_urls"]);
});

Deno.test("cart-create: include goes on the QUERY string, not in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: v3Envelope({}) }]);
  await cartCreate.execute({ lineItems: [], include: ["redirect_urls"] }, ctx);
  assertEquals(queryOf(calls[0].url), { include: "redirect_urls" });
  assertEquals(bodyOf(calls[0]), { line_items: [] });
});

Deno.test("cart-create: currency is an object, not a bare code", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: v3Envelope({}) }]);
  await cartCreate.execute({ lineItems: [], currency: '{"code":"USD"}', customerId: 12 }, ctx);
  const body = bodyOf(calls[0]) as Record<string, unknown>;
  assertEquals(body.currency, { code: "USD" });
  assertEquals(body.customer_id, 12);
});

Deno.test("cart-create: is the vendor's own route to an order that emails the customer", () => {
  assert(cartCreate.description?.includes("checkout link"), cartCreate.description);
  assertEquals(cartCreate.idempotent, false);
});
