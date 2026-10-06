import { assertEquals, assertRejects } from "@std/assert";
import customerGet from "../../actions/customer-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-get: sends GET /customers/${seg(input.customerId)}", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 1, "email": "a@b.co" } }]);
  const out = await customerGet.execute({ "customerId": "a@b.co" } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/customers/a%40b.co");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 1, "email": "a@b.co" });
});

Deno.test("customer-get: a 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "bad input" } }]);
  await assertRejects(
    () => customerGet.execute({ "customerId": "a@b.co" } as never, ctx) as Promise<unknown>,
    Error,
    "bad input",
  );
});
