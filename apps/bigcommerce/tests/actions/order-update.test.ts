import { assert, assertEquals } from "@std/assert";
import orderUpdate from "../../actions/order-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("order-update: PUTs a partial order", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 100, status: "Shipped" } }]);
  await orderUpdate.execute({ orderId: 100, fields: { status_id: 2 } }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v2/orders/100");
  assertEquals(bodyOf(calls[0]), { status_id: 2 });
});

Deno.test("order-update: notes that a status change is what fires customer email", () => {
  const fields = orderUpdate.params?.find((p) => p.key === "fields");
  assert(fields?.hint?.includes("notification"), fields?.hint);
  assertEquals(orderUpdate.idempotent, true);
});
