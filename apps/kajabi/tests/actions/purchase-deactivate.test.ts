import { assert, assertEquals } from "@std/assert";
import purchaseDeactivate from "../../actions/purchase-deactivate.ts";
import { doc, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("purchase-deactivate: POSTs to the action route with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7", "purchases") }]);
  await purchaseDeactivate.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/v1/purchases/7/deactivate");
  assertEquals(calls[0].body, null);
});

Deno.test("purchase-deactivate: an id with a slash is percent-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await purchaseDeactivate.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/purchases/a%2Fb/deactivate");
});

Deno.test("purchase-deactivate: is idempotent", () => {
  assertEquals(purchaseDeactivate.idempotent, true);
});

/**
 * The sharpest edge in this API, quoted from Kajabi: *"Deactivate a purchase by
 * ID, this will not cancel the subscription."* The intuitive workflow — "the
 * member cancelled, deactivate their purchase" — keeps charging their card.
 * An operator picking actions from a list must be warned in the description
 * itself, not only in the source.
 */
Deno.test("purchase-deactivate: warns in its description that billing continues", () => {
  const d = purchaseDeactivate.description!;
  assert(/WARNING/i.test(d), "no warning in the description");
  assert(d.includes("purchase-cancel-subscription"), "does not name the correct action");
});
