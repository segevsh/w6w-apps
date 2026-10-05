import { assertEquals, assertRejects } from "@std/assert";
import offerCodeList from "../../actions/offer-code-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "productId": "productId-1==" };

Deno.test("offer-code-list: sends GET /v2/products/productId-1%3D%3D/offer_codes with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "offer_codes": [{ "id": "a" }] } }]);
  await offerCodeList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/products/productId-1%3D%3D/offer_codes");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("offer-code-list: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true, "offer_codes": [{ "id": "a" }] } }]);
  assertEquals(await offerCodeList.execute(INPUT, ctx), { "offerCodes": [{ "id": "a" }] });
});

Deno.test("offer-code-list: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(offerCodeList.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("offer-code-list: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(offerCodeList.execute(INPUT, ctx)), Error, "refused");
});
