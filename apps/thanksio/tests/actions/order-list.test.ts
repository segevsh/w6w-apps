import { assert, assertEquals, assertRejects } from "@std/assert";
import orderList from "../../actions/order-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("order-list: calls GET /api/v2/orders/list and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  const out = await orderList.execute(
    { "itemsPerPage": 5, "subAccountId": 2, "type": "postcard6x9" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/orders/list");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {
    "items_per_page": "5",
    "sub_account_id": "2",
    "type": "postcard6x9",
  });
  assertEquals(calls[0].body, null);
  assert((out.orders as unknown[]).length === 1, JSON.stringify(out));
});

Deno.test("order-list: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { "message": "Unauthorized" } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        orderList.execute(
          { "itemsPerPage": 5, "subAccountId": 2, "type": "postcard6x9" } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("HTTP 403") && err.message.includes("Unauthorized"), err.message);
});
