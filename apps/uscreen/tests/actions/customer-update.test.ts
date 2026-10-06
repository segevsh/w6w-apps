import { assertEquals, assertRejects } from "@std/assert";
import customerUpdate from "../../actions/customer-update.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-update: sends PUT /customers/${seg(input.customerId)}", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 5, "name": "Bo" } }]);
  const out = await customerUpdate.execute(
    { "customerId": "5", "name": "Bo", "tags": "vip" } as never,
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/customers/5");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), { "name": "Bo", "tags": ["vip"] });
  assertEquals(out, { "id": 5, "name": "Bo" });
});

Deno.test("customer-update: a 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "bad input" } }]);
  await assertRejects(
    () =>
      customerUpdate.execute(
        { "customerId": "5", "name": "Bo", "tags": "vip" } as never,
        ctx,
      ) as Promise<unknown>,
    Error,
    "bad input",
  );
});
