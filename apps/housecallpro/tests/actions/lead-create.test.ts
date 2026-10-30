import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import leadCreate from "../../actions/lead-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("lead-create: POSTs with a customer id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "l1" } }]);
  await leadCreate.execute({ customerId: "c1", addressId: "a1", leadSource: "Referral" }, ctx);

  assertEquals(pathOf(calls[0].url), "/leads");
  assertEquals(bodyOf(calls[0]), {
    customer_id: "c1",
    address_id: "a1",
    lead_source: "Referral",
  });
});

test("lead-create: accepts the inline customer and address objects instead", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await leadCreate.execute({
    customer: '{"first_name":"Ada","email":"ada@example.com"}',
    address: { street: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  }, ctx);

  const body = bodyOf(calls[0]);
  assertEquals(body.customer, { first_name: "Ada", email: "ada@example.com" });
  assertEquals((body.address as Record<string, string>).city, "Austin");
});

test("lead-create: neither half of an either/or pair is marked required", () => {
  for (const key of ["customerId", "customer", "addressId", "address"]) {
    assertEquals(leadCreate.params?.find((p) => p.key === key)?.required, undefined, key);
  }
});
