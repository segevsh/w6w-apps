import { assertEquals, assertRejects } from "@std/assert";
import orderGet from "../../actions/order-get.ts";
import { API_ROOT, envelope, mockCtx } from "../_helpers.ts";

Deno.test("order-get: GETs /orders/{id} and returns the record", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7, name: "X" }) }]);
  const out = await orderGet.execute({ id: 7 }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/orders/7`);
  assertEquals(calls[0].body, null);
  assertEquals(out, { data: { id: 7, name: "X" } });
});

Deno.test("order-get: a non-JSON 200 (proxy page) is refused", async () => {
  const { ctx } = mockCtx([{
    headers: { "content-type": "text/html" },
    body: "<html>login</html>",
  }]);
  await assertRejects(async () => await orderGet.execute({ id: 7 }, ctx), Error, "non-JSON");
});

Deno.test("order-get: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(async () => await orderGet.execute({ id: 7 }, ctx), Error, "401");
});

Deno.test("order-get: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(async () => await orderGet.execute({ id: 7 }, ctx), Error, "ThrottleLimit");
});
