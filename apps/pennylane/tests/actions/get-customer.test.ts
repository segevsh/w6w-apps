import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, rejection } from "../_helpers.ts";
import action from "../../actions/get-customer.ts";

test("get-customer: GETs /customers/{id} and returns the customer", async () => {
  const customer = { id: 42, name: "Acme", customer_type: "company" };
  const { ctx, calls } = mockCtx([{ body: customer }]);
  const res = await action.execute({ id: "42" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/customers/42");
  assertEquals(calls[0].body, null);
  assertEquals(res, customer);
});

test("get-customer: a 404 names the path and the vendor's message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: "not_found", message: "Customer not found" },
  }]);
  const err = await rejection(action.execute({ id: "7" }, ctx));
  assert(err instanceof Error);
  assert(err.message.includes("404"), err.message);
  assert(err.message.includes("/api/external/v2/customers/7"), err.message);
  assert(err.message.includes("Customer not found"), err.message);
});
