import { assertEquals, assertRejects } from "@std/assert";
import offerGet from "../../actions/offer-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("offer-get: sends GET /offers/${seg(input.offerId)}", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 3 } }]);
  const out = await offerGet.execute({ "offerId": "3" } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/offers/3");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 3 });
});

Deno.test("offer-get: a 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "bad input" } }]);
  await assertRejects(
    () => offerGet.execute({ "offerId": "3" } as never, ctx) as Promise<unknown>,
    Error,
    "bad input",
  );
});
