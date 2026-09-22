import { assertEquals, assertThrows } from "@std/assert";
import getInventoryItems from "../../actions/get-inventory-items.ts";
import { API_ROOT, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-inventory-items: GET /1.0/commerce/inventory/{variantIdCsvs}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { inventory: [{ sku: "TSHIRT-M", variantId: "V1", quantity: 10 }] },
  }]);
  const out = await getInventoryItems.execute!({ variantIds: "V1, V2 ,V3" }, ctx);

  assertEquals(calls[0].method, "GET");
  // Comma-separated in one path segment, trimmed; no pagination on this route.
  assertEquals(pathOf(calls[0].url), "/1.0/commerce/inventory/V1,V2,V3");
  assertEquals(out.inventory?.[0].variantId, "V1");
});

Deno.test("get-inventory-items: a single id is a one-element list", async () => {
  const { ctx, calls } = mockCtx([{ body: { inventory: [] } }]);
  await getInventoryItems.execute!({ variantIds: "V1" }, ctx);

  assertEquals(calls[0].url, `${API_ROOT}/1.0/commerce/inventory/V1`);
});

Deno.test("get-inventory-items: more than 50 ids is refused before the request", () => {
  const { ctx } = mockCtx([]);
  const ids = Array.from({ length: 51 }, (_, i) => `V${i}`).join(",");
  assertThrows(
    () => getInventoryItems.execute!({ variantIds: ids }, ctx),
    Error,
    "at most 50",
  );
});

Deno.test("get-inventory-items: an empty id list is refused before the request", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () => getInventoryItems.execute!({ variantIds: " , " }, ctx),
    Error,
    "at least one id",
  );
});

Deno.test("get-inventory-items: a 404 with INVENTORY_ITEM_NOT_FOUND is named", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("INVALID_REQUEST_ERROR", {
      subtype: "INVENTORY_ITEM_NOT_FOUND",
      message: "Variant not found",
    }),
  }]);

  let message = "";
  try {
    await getInventoryItems.execute!({ variantIds: "V9" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("INVENTORY_ITEM_NOT_FOUND"), true);
  assertEquals(message.includes("Variant not found"), true);
});
