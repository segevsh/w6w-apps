import { assert, assertEquals, assertRejects } from "@std/assert";
import orderTrack from "../../actions/order-track.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("order-track: calls GET /api/v2/orders/42/track and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "data": { "id": 42, "order": { "id": 42 }, "stats": { "delivered": 1 } } },
  }]);
  const out = await orderTrack.execute({ "orderId": "42" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/orders/42/track");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assert(
    (out.stats as Record<string, number>).delivered === 1 &&
      (out.order as Record<string, number>).id === 42,
    JSON.stringify(out),
  );
});

Deno.test("order-track: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { "message": "Not Found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(orderTrack.execute({ "orderId": "42" } as never, ctx)),
    Error,
  );
  assert(err.message.includes("HTTP 404") && err.message.includes("Not Found"), err.message);
});
