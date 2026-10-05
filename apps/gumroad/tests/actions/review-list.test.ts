import { assertEquals, assertRejects } from "@std/assert";
import reviewList from "../../actions/review-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "productId": "productId-1==", "pageKey": "pageKey-1" };

Deno.test("review-list: sends GET /v2/products/productId-1%3D%3D/reviews with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "product_reviews": [{ "id": "a" }], "next_page_key": "nk-1" },
  }]);
  await reviewList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/products/productId-1%3D%3D/reviews");
  assertEquals(queryOf(calls[0].url), { "page_key": "pageKey-1" });
  assertEquals(calls[0].body, null);
});

Deno.test("review-list: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "product_reviews": [{ "id": "a" }], "next_page_key": "nk-1" },
  }]);
  assertEquals(await reviewList.execute(INPUT, ctx), {
    "productReviews": [{ "id": "a" }],
    "nextPageKey": "nk-1",
  });
});

Deno.test("review-list: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(reviewList.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("review-list: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(reviewList.execute(INPUT, ctx)), Error, "refused");
});
