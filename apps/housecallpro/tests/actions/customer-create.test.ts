import { assertEquals, assertRejects } from "@std/assert";
import customerCreate from "../../actions/customer-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-create: POSTs the snake_case body the API documents", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "c1" } }]);
  await customerCreate.execute({
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    mobileNumber: "+15125550100",
    notificationsEnabled: false,
    tags: "vip, repeat",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/customers");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
    mobile_number: "+15125550100",
    notifications_enabled: false,
    tags: ["vip", "repeat"],
  });
});

Deno.test("customer-create: addresses accept a JSON string as well as a parsed array", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await customerCreate.execute({ addresses: '[{"street":"1 Main St"}]' }, ctx);
  await customerCreate.execute({ addresses: [{ street: "1 Main St" }] }, ctx);

  assertEquals(bodyOf(calls[0]), { addresses: [{ street: "1 Main St" }] });
  assertEquals(bodyOf(calls[1]), bodyOf(calls[0]));
});

Deno.test("customer-create: malformed addresses JSON fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await customerCreate.execute({ addresses: "{not json" }, ctx);
    },
    Error,
    "Addresses is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("customer-create: is not idempotent — a retry would duplicate the customer", () => {
  assertEquals(customerCreate.idempotent, false);
});
