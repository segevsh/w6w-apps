import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/customer-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-get: GET /customers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1" } }]);
  const out = await action.execute({ customerId: "x1" }, ctx) as { id: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1.0/customers/{id}".replace("{id}", "x1"));
  assertEquals(out.id, "x1");
});

Deno.test("customer-get: a slash in the id cannot leave the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ customerId: "a/../b" }, ctx);
  assertEquals(pathOf(calls[0].url).includes("a%2F..%2Fb"), true);
});

Deno.test("customer-get: a missing id is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute({}, ctx)), Error, "required");
  assertEquals(calls.length, 0);
});

Deno.test("customer-get: surfaces the vendor error code", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("NOT_FOUND", "The resource was not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(action.execute({ customerId: "nope" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("NOT_FOUND"), true, err.message);
});
