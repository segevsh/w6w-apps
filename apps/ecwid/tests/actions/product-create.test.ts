import { assertEquals } from "@std/assert";
import productCreate from "../../actions/product-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("product-create: POSTs to /products and returns the new id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 692730761 } }]);
  const out = await productCreate.execute(
    { name: "Widget", price: 10, sku: "W-1" },
    ctx,
  ) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/products");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { name: "Widget", price: 10, sku: "W-1" });
  assertEquals(out.id, 692730761);
});

Deno.test("product-create: categoryIds goes out as the array of numbers the API expects", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await productCreate.execute(
    { name: "W", price: 1, sku: "S", categoryIds: "9691094,9691095" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body ?? "{}").categoryIds, [9691094, 9691095]);
});

Deno.test("product-create: unset fields are left out, and false is not one of them", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await productCreate.execute(
    { name: "W", price: 1, sku: "S", enabled: false, quantity: 0 },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    name: "W",
    price: 1,
    sku: "S",
    enabled: false,
    quantity: 0,
  });
});

Deno.test("product-create: name, price and sku are the fields the API marks Required", () => {
  for (const key of ["name", "price", "sku"]) {
    assertEquals(
      productCreate.params?.find((p) => p.key === key)?.required,
      true,
      `${key} is declared optional`,
    );
  }
});
