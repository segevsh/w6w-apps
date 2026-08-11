import { assert, assertEquals } from "@std/assert";
import orderCreate from "../../actions/order-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const MINIMAL = {
  billingAddress: { first_name: "Jane", last_name: "Doe", email: "jane@example.com" },
  products: [{ product_id: 77, quantity: 1 }],
};

Deno.test("order-create: POSTs to the v2 path with the guide's minimum body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 100, status: "Pending" } }]);
  const out = await orderCreate.execute(MINIMAL, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v2/orders");
  assertEquals(bodyOf(calls[0]), {
    billing_address: MINIMAL.billingAddress,
    products: MINIMAL.products,
  });
  assertEquals(out.id, 100);
});

Deno.test("order-create: extraFields merge in for shipping_addresses and the rest", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await orderCreate.execute({
    ...MINIMAL,
    statusId: 11,
    externalSource: "M-MIG",
    extraFields: '{"shipping_addresses":[{"city":"Austin"}]}',
  }, ctx);

  const body = bodyOf(calls[0]) as Record<string, unknown>;
  assertEquals(body.status_id, 11);
  assertEquals(body.external_source, "M-MIG");
  assertEquals(body.shipping_addresses, [{ city: "Austin" }]);
});

Deno.test("order-create: warns that it does NOT send the store's order email", () => {
  // The vendor states this outright and its remedy is to create a cart instead.
  assert(orderCreate.description?.includes("does NOT send"), orderCreate.description);
  assertEquals(orderCreate.idempotent, false);
});

Deno.test("order-create: names the M-MIG code for historical migrations", () => {
  // Getting this wrong inflates the store's GMV, which BigCommerce prices on.
  const external = orderCreate.params?.find((p) => p.key === "externalSource");
  assert(external?.hint?.includes("M-MIG"), external?.hint);
  assert(external?.hint?.includes("GMV"), external?.hint);
});
