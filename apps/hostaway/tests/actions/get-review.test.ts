import { assertEquals, assertRejects } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/get-review.ts";

Deno.test("get-review: GETs /v1/reviews/{id} and forwards the preview flag", async () => {
  const { ctx, calls } = mockCtx([envelope({ id: 1, rating: 9 })]);
  const review = await action.execute({ reviewId: 1, preview: true }, ctx) as { rating: number };
  assertEquals(calls[0].url, "https://api.hostaway.com/v1/reviews/1?preview=1");
  assertEquals(review.rating, 9);
});

Deno.test("get-review: omits preview when unset", async () => {
  const { ctx, calls } = mockCtx([envelope({ id: 1 })]);
  await action.execute({ reviewId: 1 }, ctx);
  assertEquals(calls[0].url, "https://api.hostaway.com/v1/reviews/1");
});

Deno.test("get-review: refuses a call without a review id", async () => {
  const { ctx } = mockCtx();
  await assertRejects(() => Promise.resolve(action.execute({}, ctx)), Error, "reviewId");
});
