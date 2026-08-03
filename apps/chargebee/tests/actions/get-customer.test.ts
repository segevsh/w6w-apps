import { assert, assertEquals, assertRejects } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/get-customer.ts";

Deno.test("get-customer: is a read action over the customer resource", () => {
  assertEquals(action.key, "get-customer");
  assertEquals(action.type, "read");
  assertEquals(action.resource, "customer");
});

Deno.test("get-customer: GETs /customers/{id} with no query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { customer: { id: "cust_1" } } }]);
  await action.execute({ customerId: "cust_1" }, connected(ctx));
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/api/v2/customers/cust_1");
  // The endpoint documents no query parameters, so none are sent.
  assertEquals(url.search, "");
});

Deno.test("get-customer: percent-encodes an id that would otherwise change the route", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { customer: {} } }]);
  await action.execute({ customerId: "a b?c" }, connected(ctx));
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/customers/a%20b%3Fc");
});

Deno.test("get-customer: returns customer and card together", async () => {
  const body = { customer: { id: "cust_1" }, card: { last4: "4242" } };
  const { ctx } = mockCtx([{ status: 200, body }]);
  assertEquals(await action.execute({ customerId: "cust_1" }, connected(ctx)), body);
  assertEquals(
    (action.output as Array<{ key: string }>).map((o) => o.key),
    ["customer", "card"],
  );
});

Deno.test("get-customer: surfaces a 404 as an error rather than an empty result", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { message: "Customer not found", api_error_code: "resource_not_found" },
  }]);
  const err = await assertRejects(async () => {
    await action.execute({ customerId: "nope" }, connected(ctx));
  });
  assert((err as Error).message.includes("resource_not_found"));
});
