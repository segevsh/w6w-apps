import { assertEquals } from "@std/assert";
import orderGet from "../../actions/order-get.ts";
import { doc, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("order-get: GETs the resource by id", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await orderGet.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/orders/7");
});

Deno.test("order-get: forwards the sparse fieldset", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await orderGet.execute({ id: "7", fields: "order_number" }, ctx);
  assertEquals(queryOf(calls[0])["fields[orders]"], "order_number");
});

Deno.test("order-get: an id with a slash is percent-encoded, not path-injected", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await orderGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/orders/a%2Fb");
});

Deno.test("order-get: forwards `include` for compound documents", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await orderGet.execute({ id: "7", include: "tags" }, ctx);
  assertEquals(queryOf(calls[0])["include"], "tags");
});
