import { assertEquals, assertRejects } from "@std/assert";
import accessGrant from "../../actions/access-grant.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("access-grant: sends POST /customers/${seg(input.customerId)}/accesses", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 9 } }]);
  const out = await accessGrant.execute(
    {
      "customerId": "5",
      "productId": 3,
      "productType": "rent",
      "performActionAt": 1800000000,
    } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/customers/5/accesses");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "product_id": 3,
    "product_type": "rent",
    "perform_action_at": "1800000000",
  });
  assertEquals(out, { "id": 9 });
});

Deno.test("access-grant: a 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "bad input" } }]);
  await assertRejects(
    () =>
      accessGrant.execute(
        {
          "customerId": "5",
          "productId": 3,
          "productType": "rent",
          "performActionAt": 1800000000,
        } as never,
        ctx,
      ) as Promise<unknown>,
    Error,
    "bad input",
  );
});
