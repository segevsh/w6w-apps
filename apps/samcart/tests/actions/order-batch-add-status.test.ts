import { assertEquals, assertRejects } from "@std/assert";
import orderBatchAddStatus from "../../actions/order-batch-add-status.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "batchId": "b-1" };
const RESPONSE = { "success": "true", "data": "ok" };

Deno.test("order-batch-add-status: sends GET /v1/orders/batch-add-to-order/b-1 with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await orderBatchAddStatus.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/orders/batch-add-to-order/b-1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("order-batch-add-status: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await orderBatchAddStatus.execute(INPUT, ctx), {
    "response": { "success": "true", "data": "ok" },
  });
});

Deno.test("order-batch-add-status: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(orderBatchAddStatus.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});
