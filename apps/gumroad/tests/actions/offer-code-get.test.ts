import { assertEquals, assertRejects } from "@std/assert";
import offerCodeGet from "../../actions/offer-code-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "productId": "productId-1==", "offerCodeId": "offerCodeId-1==" };

Deno.test("offer-code-get: sends GET /v2/products/productId-1%3D%3D/offer_codes/offerCodeId-1%3D%3D with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "offer_code": { "id": "x1", "marker": true } },
  }]);
  await offerCodeGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    pathOf(calls[0].url),
    "/v2/products/productId-1%3D%3D/offer_codes/offerCodeId-1%3D%3D",
  );
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("offer-code-get: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "offer_code": { "id": "x1", "marker": true } },
  }]);
  assertEquals(await offerCodeGet.execute(INPUT, ctx), { "id": "x1", "marker": true });
});

Deno.test("offer-code-get: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(offerCodeGet.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("offer-code-get: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(offerCodeGet.execute(INPUT, ctx)), Error, "refused");
});
