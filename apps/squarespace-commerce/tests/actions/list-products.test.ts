import { assertEquals, assertThrows } from "@std/assert";
import listProducts from "../../actions/list-products.ts";
import { API_ROOT, errorBody, mockCtx, pagination, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-products: GET /v2/commerce/products — the v2 segment, not /1.0", async () => {
  const { ctx, calls } = mockCtx([{
    body: { pagination: pagination(), products: [{ id: "P1", type: "PHYSICAL", name: "Tee" }] },
  }]);
  const out = await listProducts.execute!({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/v2/commerce/products`);
  assertEquals(pathOf(calls[0].url), "/v2/commerce/products");
  assertEquals(out.products?.[0].name, "Tee");
});

Deno.test("list-products: `type` is sent as a REPEATED query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { pagination: pagination(), products: [] } }]);
  await listProducts.execute!({
    type: ["PHYSICAL", "GIFT_CARD"],
    query: "tee",
    modifiedAfter: "2026-09-01T00:00:00Z",
    modifiedBefore: "2026-09-30T23:59:59Z",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    type: ["PHYSICAL", "GIFT_CARD"],
    query: "tee",
    modifiedAfter: "2026-09-01T00:00:00Z",
    modifiedBefore: "2026-09-30T23:59:59Z",
  });
});

Deno.test("list-products: one half of the modified pair is rejected before the call", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () => listProducts.execute!({ modifiedBefore: "2026-09-30T23:59:59Z" }, ctx),
    Error,
    "must be supplied together",
  );
});

Deno.test("list-products: a 400 is surfaced with its subtype", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("INVALID_REQUEST_ERROR", { subtype: "INVALID_ARGUMENT", message: "bad type" }),
  }]);

  let message = "";
  try {
    await listProducts.execute!({ type: ["NOPE"] }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("400 INVALID_REQUEST_ERROR/INVALID_ARGUMENT"), true);
});
