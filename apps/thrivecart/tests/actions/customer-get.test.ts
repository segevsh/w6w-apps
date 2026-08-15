import { assertEquals, assertRejects } from "@std/assert";
import customerGet from "../../actions/customer-get.ts";
import { errorBody, formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-get: calls POST /customer with the email in the form body", async () => {
  const { ctx, calls } = mockCtx([
    { body: { customer: { name: "Jane" }, purchases: [], subscriptions: [], lifetime_value: {} } },
  ]);
  const out = await customerGet.execute({ email: "jane@example.com" }, ctx) as {
    customer: { name: string };
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/customer");
  assertEquals(formOf(calls[0]), { email: "jane@example.com" });
  assertEquals(out.customer.name, "Jane");
});

Deno.test("customer-get: a 404 surfaces the vendor's not-found text", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorBody("There are no orders associated with this customer.") },
  ]);
  const err = await assertRejects(() =>
    Promise.resolve(customerGet.execute({ email: "nobody@example.com" }, ctx))
  );
  assertEquals(
    (err as Error).message.includes("There are no orders associated with this customer."),
    true,
  );
});
