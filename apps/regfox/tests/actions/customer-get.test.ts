import { assertEquals } from "@std/assert";
import action from "../../actions/customer-get.ts";
import { envelope, exec, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-get: gets the customer by id with the product and returns it", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 42 }) }]);
  const out = await exec(action, { customerId: "42", product: "regfox.com" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/public/search/customers/42");
  assertEquals(queryOf(calls[0].url).product, "regfox.com");
  assertEquals(action.params!.some((p) => p.key === "expand"), false);
  assertEquals(out.customer, { id: 42 });
});

Deno.test("customer-get: the id is path-encoded and required", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await exec(action, { customerId: "a/b", product: "regfox.com" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/public/search/customers/a%2Fb");
  assertEquals(action.params!.find((p) => p.key === "customerId")?.required, true);
});

Deno.test("customer-get: a 404 error envelope throws", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { responseCode: 404, error: { code: 4404, description: "not found" } },
  }]);
  let threw = false;
  try {
    await exec(action, { customerId: "1", product: "regfox.com" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
