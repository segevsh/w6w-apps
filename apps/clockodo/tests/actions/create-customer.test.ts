import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-customer.ts";
import { API_ROOT, bodyOf, exec, mockCtx } from "../_helpers.ts";

Deno.test("create-customer: POSTs /v3/customers with the given fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 3, name: "ACME" } } }]);
  const out = await exec(action, {
    name: " ACME ",
    active: true,
    billableDefault: false,
    color: "5",
    number: "K-1",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/v3/customers`);
  assertEquals(bodyOf(calls[0]), {
    name: "ACME",
    active: true,
    number: "K-1",
    billable_default: false,
    color: 5,
  });
  assertEquals(out, { data: { id: 3, name: "ACME" } });
});

Deno.test("create-customer: a missing name is refused; a 409 surfaces", async () => {
  await assertRejects(() => exec(action, { name: "  " }, mockCtx().ctx), Error, "name is required");
  const { ctx } = mockCtx([{
    status: 409,
    body: { errors: [{ type: "Conflict", message: "exists" }] },
  }]);
  await assertRejects(() => exec(action, { name: "A" }, ctx), Error, "exists");
});
