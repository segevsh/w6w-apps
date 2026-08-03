import { assertEquals } from "@std/assert";
import purchaseReactivate from "../../actions/purchase-reactivate.ts";
import { doc, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("purchase-reactivate: POSTs to the action route with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7", "purchases") }]);
  await purchaseReactivate.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/v1/purchases/7/reactivate");
  assertEquals(calls[0].body, null);
});

Deno.test("purchase-reactivate: an id with a slash is percent-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await purchaseReactivate.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/purchases/a%2Fb/reactivate");
});

Deno.test("purchase-reactivate: is idempotent", () => {
  assertEquals(purchaseReactivate.idempotent, true);
});
