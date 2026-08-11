import { assert, assertEquals } from "@std/assert";
import cartGet from "../../actions/cart-get.ts";
import { mockCtx, pathOf, queryOf, v3Envelope } from "../_helpers.ts";

const CART_ID = "00000000-0000-0000-0000-000000000000";

Deno.test("cart-get: GETs one cart by UUID", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({ id: CART_ID, cart_amount: 12 }) }]);
  const out = await cartGet.execute({ cartId: CART_ID }, ctx);

  assertEquals(pathOf(calls[0].url), `/stores/abc123/v3/carts/${CART_ID}`);
  assertEquals(out, { id: CART_ID, cart_amount: 12 });
});

Deno.test("cart-get: redirect_urls is what makes a cart shoppable again", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({}) }]);
  await cartGet.execute({ cartId: CART_ID, include: ["redirect_urls"] }, ctx);
  assertEquals(queryOf(calls[0].url), { include: "redirect_urls" });
});

Deno.test("cart-get: requires an id, because BigCommerce cannot list carts", () => {
  // Probed live: GET /v3/carts is a 404 "route is not found" while POST is a 401.
  const cartId = cartGet.params?.find((p) => p.key === "cartId");
  assertEquals(cartId?.required, true);
  assert(cartGet.description?.includes("no way to list carts"), cartGet.description);
});
