import { assertEquals } from "@std/assert";
import customerCreate from "../../actions/customer-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-create: POSTs to /customers and returns the new id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 188278629 } }]);
  const out = await customerCreate.execute(
    {
      email: "example_customer@example.com",
      customerGroupId: 0,
      billingPerson: { name: "Support team" },
      taxExempt: false,
    },
    ctx,
  ) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/customers");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    email: "example_customer@example.com",
    customerGroupId: 0,
    billingPerson: { name: "Support team" },
    taxExempt: false,
  });
  assertEquals(out.id, 188278629);
});

Deno.test("customer-create: the email is required — the one Required field on the page", () => {
  assertEquals(customerCreate.params?.find((p) => p.key === "email")?.required, true);
  const required = (customerCreate.params ?? []).filter((p) => p.required === true);
  assertEquals(required.map((p) => p.key), ["email"]);
});

Deno.test("customer-create: a customer password is not reachable from an action", () => {
  const keys = (customerCreate.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("password"), false);
});
