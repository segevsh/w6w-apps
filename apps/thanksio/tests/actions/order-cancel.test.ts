import { assert, assertEquals, assertRejects } from "@std/assert";
import orderCancel from "../../actions/order-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("order-cancel: calls PUT /api/v2/orders/42/cancel and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "order": { "id": 42, "status": "cancelled" } } }]);
  const out = await orderCancel.execute({ "orderId": "42" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v2/orders/42/cancel");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assert((out.order as Record<string, string>).status === "cancelled", JSON.stringify(out));
});

Deno.test("order-cancel: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { "message": "Order cannot be cancelled" } }]);
  const err = await assertRejects(
    () => Promise.resolve(orderCancel.execute({ "orderId": "42" } as never, ctx)),
    Error,
  );
  assert(
    err.message.includes("HTTP 400") && err.message.includes("cannot be cancelled"),
    err.message,
  );
});
