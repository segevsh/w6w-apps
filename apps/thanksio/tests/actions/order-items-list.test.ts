import { assert, assertEquals, assertRejects } from "@std/assert";
import orderItemsList from "../../actions/order-items-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("order-items-list: calls GET /api/v2/orders/42/items and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  const out = await orderItemsList.execute(
    { "orderId": "42", "perPage": 10, "page": 2 } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/orders/42/items");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), { "per_page": "10", "page": "2" });
  assertEquals(calls[0].body, null);
  assert((out.items as unknown[]).length === 1, JSON.stringify(out));
});

Deno.test("order-items-list: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { "message": "x", "errors": { "per_page": ["Too big"] } },
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        orderItemsList.execute({ "orderId": "42", "perPage": 10, "page": 2 } as never, ctx),
      ),
    Error,
  );
  assert(
    err.message.includes("HTTP 422") && err.message.includes("per_page: Too big"),
    err.message,
  );
});
