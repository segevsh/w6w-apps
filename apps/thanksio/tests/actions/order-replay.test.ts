import { assert, assertEquals, assertRejects } from "@std/assert";
import orderReplay from "../../actions/order-replay.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("order-replay: calls POST /api/v2/orders/42/replay and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "id": 43, "status": "reviewing", "replayed_from_order_id": 42 },
  }]);
  const out = await orderReplay.execute(
    {
      "orderId": "42",
      "scheduleFor": "2026-12-01",
      "recipients": '[{"address":"1 Main St"}]',
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/orders/42/replay");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "schedule_for": "2026-12-01",
    "recipients": [{ "address": "1 Main St" }],
  });
  assert(out.orderId === 43, JSON.stringify(out));
});

Deno.test("order-replay: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      "status": "Order #42 is still being fulfilled and cannot be replayed until it has settled.",
      "message": "still fulfilling",
    },
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        orderReplay.execute(
          {
            "orderId": "42",
            "scheduleFor": "2026-12-01",
            "recipients": '[{"address":"1 Main St"}]',
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(
    err.message.includes("HTTP 400") && err.message.includes("still being fulfilled"),
    err.message,
  );
});

Deno.test("order-replay: is a non-idempotent perform whose description warns about spend", () => {
  assertEquals(orderReplay.idempotent, false);
  assert(/real money/i.test(orderReplay.description ?? ""));
});
