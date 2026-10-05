import { assertEquals, assertRejects } from "@std/assert";
import orderGet from "../../actions/order-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "orderId": 1337,
  "createdAtMin": "2025-01-16T14:30:00Z",
  "createdAtMax": "2025-01-31",
  "testMode": "false",
};
const RESPONSE = { "id": 1, "marker": true };

Deno.test("order-get: sends GET /v1/orders/1337 with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await orderGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/orders/1337");
  assertEquals(queryOf(calls[0].url), {
    "created_at_min": "2025-01-16T14:30:00Z",
    "created_at_max": "2025-01-31",
    "test_mode": "false",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("order-get: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await orderGet.execute(INPUT, ctx), { "id": 1, "marker": true });
});

Deno.test("order-get: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(() => Promise.resolve(orderGet.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});

Deno.test("order-get: a non-integer orderId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(orderGet.execute({ ...INPUT, orderId: "1/../2" as unknown as number }, ctx)),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
