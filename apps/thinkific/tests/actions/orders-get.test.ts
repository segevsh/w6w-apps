import { assertEquals } from "@std/assert";
import ordersGet from "../../actions/orders-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("orders-get: fetches GET /orders/{id}, amount_dollars stays a string (vendor-typed)", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { id: 9, amount_dollars: "20.0", amount_cents: 2000, status: "complete" },
    },
  ]);
  const out = await ordersGet.execute({ id: "9" }, ctx) as { amount_dollars: unknown };
  assertEquals(pathOf(calls[0].url), "/api/public/v1/orders/9");
  assertEquals(typeof out.amount_dollars, "string");
});
