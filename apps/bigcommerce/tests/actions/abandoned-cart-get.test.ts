import { assert, assertEquals } from "@std/assert";
import abandonedCartGet from "../../actions/abandoned-cart-get.ts";
import { mockCtx, pathOf, v3Envelope } from "../_helpers.ts";

Deno.test("abandoned-cart-get: GETs by the recovery-link token", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({ id: "cart-1" }) }]);
  const out = await abandonedCartGet.execute({ token: "tok-abc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/abandoned-carts/tok-abc");
  assertEquals(out, { id: "cart-1" });
});

Deno.test("abandoned-cart-get: says the token is not the cart UUID", () => {
  const token = abandonedCartGet.params?.find((p) => p.key === "token");
  assert(token?.hint?.includes("Not the cart's UUID"), token?.hint);
});

Deno.test("abandoned-cart-get: a token with a separator cannot escape the path", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({}) }]);
  await abandonedCartGet.execute({ token: "../../v2/store" }, ctx);
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/abandoned-carts/..%2F..%2Fv2%2Fstore");
});
