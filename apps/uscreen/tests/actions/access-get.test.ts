import { assertEquals, assertRejects } from "@std/assert";
import accessGet from "../../actions/access-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("access-get: sends GET /customers/${seg(input.customerId)}/accesses/${seg(input.accessId)}", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 9 } }]);
  const out = await accessGet.execute({ "customerId": "5", "accessId": "9" } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/customers/5/accesses/9");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 9 });
});

Deno.test("access-get: a 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "bad input" } }]);
  await assertRejects(
    () =>
      accessGet.execute({ "customerId": "5", "accessId": "9" } as never, ctx) as Promise<unknown>,
    Error,
    "bad input",
  );
});
