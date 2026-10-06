import { assertEquals } from "@std/assert";
import action from "../../actions/order-get.ts";
import { envelope, exec, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("order-get: gets the order by id with the product and returns it", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 42 }) }]);
  const out = await exec(action, {
    orderId: "42",
    product: "regfox.com",
    expand: "registrants,tickets",
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/public/search/orders/42");
  assertEquals(queryOf(calls[0].url).product, "regfox.com");
  assertEquals(queryOf(calls[0].url)["[]expand"], "registrants,tickets");
  assertEquals(out.order, { id: 42 });
});

Deno.test("order-get: the id is path-encoded and required", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await exec(action, { orderId: "a/b", product: "regfox.com" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/public/search/orders/a%2Fb");
  assertEquals(action.params!.find((p) => p.key === "orderId")?.required, true);
});

Deno.test("order-get: a 404 error envelope throws", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { responseCode: 404, error: { code: 4404, description: "not found" } },
  }]);
  let threw = false;
  try {
    await exec(action, { orderId: "1", product: "regfox.com" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
