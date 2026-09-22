import { assertEquals, assertRejects } from "@std/assert";
import getCustomer from "../../actions/get-customer.ts";
import { envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-customer: GET /customers/{id}, unwrapping the resource envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope("customers", { id: "CU1", email: "a@b.co" }),
  }]);
  const out = await getCustomer.execute!({ customerId: "CU1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/customers/CU1");
  assertEquals(out.email, "a@b.co");
});

Deno.test("get-customer: a slash pasted into the id cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("customers", {}) }]);
  await getCustomer.execute!({ customerId: "CU1/../../creditors" }, ctx);
  assertEquals(pathOf(calls[0].url), "/customers/CU1%2F..%2F..%2Fcreditors");
});

Deno.test("get-customer: a 404 surfaces the vendor's own code, not a bare status", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("invalid_api_usage", {
      code: 404,
      message: "Not found",
      errors: [{ reason: "not_found", message: "Resource not found" }],
    }),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(getCustomer.execute!({ customerId: "nope" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404 invalid_api_usage/not_found"), true, err.message);
});
