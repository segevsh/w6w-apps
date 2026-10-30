import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import customerCreate from "../../actions/customer-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("customer-create: posts to /customers", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cust_1", name: "Aisha Sharma" } }]);
  const out = await customerCreate.execute(
    { name: "Aisha Sharma", contact: "+919876543210", email: "aisha@example.com" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/customers");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Aisha Sharma",
    contact: "+919876543210",
    email: "aisha@example.com",
  });
  assertEquals(out, { id: "cust_1", name: "Aisha Sharma" });
});

test("customer-create: is not idempotent — a retry can create a duplicate profile attempt", () => {
  assertEquals(customerCreate.idempotent, false);
});
