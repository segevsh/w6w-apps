import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/product-delete.ts";
import { mockCtx } from "../_helpers.ts";

test("product-delete: DELETEs /products/{n} with the number percent-encoded", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({ productNumber: "A/1" }, ctx), { deleted: true });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://restapi.e-conomic.com/products/A%2F1");
});
