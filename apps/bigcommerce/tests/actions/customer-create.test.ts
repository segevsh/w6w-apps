import { assert, assertEquals, assertRejects } from "@std/assert";
import customerCreate from "../../actions/customer-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const ONE = { email: "jane@example.com", first_name: "Jane", last_name: "Doe" };

Deno.test("customer-create: POSTs an ARRAY, even for one customer", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: 12 }], meta: {} } }]);
  const out = await customerCreate.execute({ customers: [ONE] }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/customers");
  assertEquals(bodyOf(calls[0]), [ONE]);
  assertEquals(out, [{ id: 12 }]);
});

Deno.test("customer-create: refuses a bare object with an explanation, not a 422", async () => {
  // Posting the object rather than a one-element array is the most common way
  // this endpoint fails, and the API's own error does not say so.
  // `mockCtx([])` throws on any fetch, so reaching the network fails the test.
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await customerCreate.execute({ customers: ONE }, ctx),
    Error,
    "takes a JSON array",
  );
});

Deno.test("customer-create: enforces the vendor's 10-per-call limit locally", async () => {
  const { ctx } = mockCtx([]);
  const eleven = Array.from({ length: 11 }, () => ONE);
  await assertRejects(
    async () => await customerCreate.execute({ customers: eleven }, ctx),
    Error,
    "at most 10 customers per call; got 11",
  );
});

Deno.test("customer-create: accepts the param as a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], meta: {} } }]);
  await customerCreate.execute({ customers: JSON.stringify([ONE]) }, ctx);
  assertEquals(bodyOf(calls[0]), [ONE]);
});

Deno.test("customer-create: is non-idempotent", () => {
  assertEquals(customerCreate.idempotent, false);
  assert(customerCreate.description?.includes("array"), customerCreate.description);
});
