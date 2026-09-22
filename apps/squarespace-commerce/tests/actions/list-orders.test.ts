import { assertEquals, assertThrows } from "@std/assert";
import listOrders from "../../actions/list-orders.ts";
import { API_ROOT, errorBody, mockCtx, pagination, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-orders: GET /1.0/commerce/orders with every documented filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { pagination: pagination(), result: [] } }]);
  const out = await listOrders.execute!({
    customerId: "C1",
    fulfillmentStatus: "FULFILLED",
    modifiedAfter: "2026-09-01T00:00:00Z",
    modifiedBefore: "2026-09-30T23:59:59Z",
    paymentStates: ["PAID", "REFUNDED"],
  }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1.0/commerce/orders");
  assertEquals(queryOf(calls[0].url), {
    customerId: "C1",
    fulfillmentStatus: "FULFILLED",
    modifiedAfter: "2026-09-01T00:00:00Z",
    modifiedBefore: "2026-09-30T23:59:59Z",
    // Comma-separated, one value — not a repeated key.
    paymentStates: "PAID,REFUNDED",
  });
  assertEquals(out.result, []);
});

Deno.test("list-orders: omitting paymentStates sends no filter at all", async () => {
  const { ctx, calls } = mockCtx([{ body: { pagination: pagination(), result: [] } }]);
  await listOrders.execute!({}, ctx);

  assertEquals(calls[0].url, `${API_ROOT}/1.0/commerce/orders`);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("list-orders: a date window cannot be combined with a cursor", () => {
  const { ctx } = mockCtx([{ body: { pagination: pagination(), result: [] } }]);
  assertThrows(
    () =>
      listOrders.execute!({
        cursor: "CUR",
        modifiedAfter: "2026-09-01T00:00:00Z",
        modifiedBefore: "2026-09-30T23:59:59Z",
      }, ctx),
    Error,
    "cannot be combined",
  );
});

Deno.test("list-orders: one half of the modified pair is rejected before the call", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () => listOrders.execute!({ modifiedAfter: "2026-09-01T00:00:00Z" }, ctx),
    Error,
    "must be supplied together",
  );
});

Deno.test("list-orders: an ambiguous auth body is surfaced verbatim", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("AUTHORIZATION_ERROR"),
  }]);

  let message = "";
  try {
    await listOrders.execute!({}, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("401 AUTHORIZATION_ERROR"), true);
});
