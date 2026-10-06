import { assertEquals } from "@std/assert";
import itemCreate from "../../actions/item-create.ts";
import { alegraError, assertRejects, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("item-create: POST /items with tax ids as [{id}] and the category as a reference", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "5", name: "Widget" } }]);
  const out = await itemCreate.execute({
    name: "Widget",
    price: 25,
    description: "d",
    reference: "W-1",
    type: "product",
    taxIds: "6, 7",
    categoryId: "54",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/items");
  assertEquals(bodyOf(calls[0]), {
    name: "Widget",
    price: 25,
    description: "d",
    reference: "W-1",
    type: "product",
    category: { id: "54" },
    tax: [{ id: "6" }, { id: "7" }],
  });
  assertEquals(out, { id: "5", name: "Widget" });
});

Deno.test("item-create: a zero price is sent (it is a value, not an absence)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "5" } }]);
  await itemCreate.execute({ name: "Free", price: 0 }, ctx);
  assertEquals(bodyOf(calls[0]), { name: "Free", price: 0 });
});

Deno.test("item-create: additionalFields can replace price with a per-list array", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "5" } }]);
  await itemCreate.execute({
    name: "X",
    price: 1,
    additionalFields: { price: [{ idPriceList: "2", price: 10 }] },
  }, ctx);
  assertEquals(bodyOf(calls[0]).price, [{ idPriceList: "2", price: 10 }]);
});

Deno.test("item-create: a 400 surfaces the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: alegraError(400, "invalid") }]);
  await assertRejects(() => itemCreate.execute({ name: "X", price: 1 }, ctx), Error, "invalid");
});
