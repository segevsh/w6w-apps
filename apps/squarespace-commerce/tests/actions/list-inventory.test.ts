import { assertEquals } from "@std/assert";
import listInventory from "../../actions/list-inventory.ts";
import { API_ROOT, errorBody, mockCtx, pagination, queryOf } from "../_helpers.ts";

Deno.test("list-inventory: GET /1.0/commerce/inventory with the cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      pagination: pagination({ hasNextPage: true, nextPageCursor: "CUR2" }),
      inventory: [{ sku: "TSHIRT-M", variantId: "V1", quantity: 10, isUnlimited: false }],
    },
  }]);
  const out = await listInventory.execute!({ cursor: "CUR1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/1.0/commerce/inventory?cursor=CUR1`);
  assertEquals(out.inventory?.[0].sku, "TSHIRT-M");
  assertEquals(out.pagination?.nextPageCursor, "CUR2");
});

Deno.test("list-inventory: an empty inventory array is a valid answer, not an error", async () => {
  const { ctx, calls } = mockCtx([{ body: { inventory: [], pagination: pagination() } }]);
  const out = await listInventory.execute!({}, ctx);

  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.inventory, []);
});

Deno.test("list-inventory: a vendor 400 is surfaced verbatim", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("INVALID_REQUEST_ERROR", {
      subtype: "INVALID_ARGUMENT",
      message: "bad cursor",
    }),
  }]);

  let message = "";
  try {
    await listInventory.execute!({ cursor: "x" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("400 INVALID_REQUEST_ERROR/INVALID_ARGUMENT"), true);
});
