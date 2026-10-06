import { assertEquals } from "@std/assert";
import action from "../../actions/product-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("product-create: POSTs name, group reference and prices; barred=false is kept", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { productNumber: "500" } }]);
  const out = await action.execute!({
    productNumber: "500",
    name: "Widget",
    productGroupNumber: 1,
    salesPrice: 100,
    costPrice: 50,
    barred: false,
  }, ctx);
  assertEquals(calls[0].url, "https://restapi.e-conomic.com/products");
  assertEquals(JSON.parse(calls[0].body!), {
    productNumber: "500",
    name: "Widget",
    productGroup: { productGroupNumber: 1 },
    salesPrice: 100,
    costPrice: 50,
    barred: false,
  });
  assertEquals(out, { productNumber: "500", product: { productNumber: "500" } });
});
