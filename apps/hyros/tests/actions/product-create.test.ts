import { assertEquals } from "@std/assert";
import { mockCtx, OK, pathOf } from "../_helpers.ts";
import productCreate from "../../actions/product-create.ts";

Deno.test("product-create: POST /products with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await productCreate.execute({ name: "P1", price: 5.66, packages: "A, B" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/products");
  assertEquals(JSON.parse(calls[0].body!), { name: "P1", price: 5.66, packages: ["A", "B"] });
  assertEquals(out, { requestId: "req1", result: "OK" });
});
