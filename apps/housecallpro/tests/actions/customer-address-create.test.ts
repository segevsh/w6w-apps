import { assertEquals } from "@std/assert";
import customerAddressCreate from "../../actions/customer-address-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-address-create: POSTs to the customer's addresses collection", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "a1", type: "service" } }]);
  const out = await customerAddressCreate.execute({
    customerId: "c1",
    street: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
    country: "US",
  }, ctx) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/customers/c1/addresses");
  assertEquals(bodyOf(calls[0]), {
    street: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
    country: "US",
  });
  assertEquals(out.id, "a1");
});

Deno.test("customer-address-create: country is required, matching the reference", () => {
  const country = customerAddressCreate.params?.find((p) => p.key === "country");
  assertEquals(country?.required, true);
});

Deno.test("customer-address-create: is not idempotent — a retry adds a second address", () => {
  assertEquals(customerAddressCreate.idempotent, false);
});
