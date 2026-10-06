import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/order-history-list.ts";

const input = { "order_id": 123, "page": 123 } as never;

Deno.test("order-history-list: GET /orders/{order_id}/histories", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "status": 200, "success": true, "data": { "id": 1 } },
  }]);
  const result = await action.execute!(input, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.salla.dev/admin/v2/orders/123/histories");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(url.searchParams.get("page"), "123");
  assertEquals(calls[0].body, null);
  assertEquals(result, { "status": 200, "success": true, "data": { "id": 1 } });
});

Deno.test("order-history-list: unset filters add no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute!({ "order_id": 123 } as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("order-history-list: a Salla error envelope throws with its message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      status: 422,
      success: false,
      error: { code: "error", message: "alert.invalid_fields", fields: { name: ["required"] } },
    },
  }]);
  let message = "";
  try {
    await action.execute!(input, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("alert.invalid_fields"), message);
  assert(message.includes("name: required"), message);
});
