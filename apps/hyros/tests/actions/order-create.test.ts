import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, OK, pathOf } from "../_helpers.ts";
import orderCreate from "../../actions/order-create.ts";

Deno.test("order-create: POST /orders with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await orderCreate.execute({
    email: "j@x.io",
    orderId: "o-1",
    items: [{ name: "P", price: 5 }],
    currency: "EUR",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/orders");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "j@x.io",
    orderId: "o-1",
    currency: "EUR",
    items: [{ name: "P", price: 5 }],
  });
  assertEquals(out, { requestId: "req1", result: "OK" });
});

Deno.test("order-create: items may arrive as a JSON string; empty items refused", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await orderCreate.execute({ email: "a@b.io", items: '[{"name":"P","price":1}]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).items, [{ name: "P", price: 1 }]);
  await assertRejects(
    async () => await orderCreate.execute({ email: "a@b.io", items: [] }, ctx),
    Error,
    "non-empty",
  );
  await assertRejects(
    async () => await orderCreate.execute({ items: [{ name: "P", price: 1 }] }, ctx),
    Error,
    "email or at least one phone",
  );
});
