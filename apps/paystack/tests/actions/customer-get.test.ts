import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/customer-get.ts";
import { errorBody, mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("customer-get: GETs /customer/{code}", async () => {
  const data = { customer_code: "CUS_1", email: "a@b.co" };
  const { ctx, calls } = mockCtx([{ body: ok(data) }]);
  assertEquals(await action.execute({ id: "CUS_1" }, ctx), data);
  assertEquals(pathOf(calls[0].url), "/customer/CUS_1");
});

Deno.test("customer-get: surfaces a not-found message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("Customer not found", "api_error", "api_error"),
  }]);
  await assertRejects(
    async () => await action.execute({ id: "CUS_x" }, ctx),
    Error,
    "Customer not found",
  );
});
