import { assertEquals } from "@std/assert";
import getOrder from "../../actions/get-order.ts";
import { API_ROOT, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-order: GET /1.0/commerce/orders/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "O1", orderNumber: "1001" } }]);
  const out = await getOrder.execute!({ id: "585d498fdee9f31a60284a37" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/1.0/commerce/orders/585d498fdee9f31a60284a37`);
  assertEquals(out.orderNumber, "1001");
});

Deno.test("get-order: an id needing escaping cannot break out of its path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "O1" } }]);
  await getOrder.execute!({ id: "a/b?c" }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.0/commerce/orders/a%2Fb%3Fc");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("get-order: a 404 with MISSING_ARGUMENT is surfaced with its subtype", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("INVALID_REQUEST_ERROR", {
      subtype: "MISSING_ARGUMENT",
      message: "Order not found",
    }),
  }]);

  let message = "";
  try {
    await getOrder.execute!({ id: "nope" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("404 INVALID_REQUEST_ERROR/MISSING_ARGUMENT"), true);
  assertEquals(message.includes("Order not found"), true);
});
