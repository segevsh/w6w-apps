import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import getReview from "../../actions/get-review.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("get-review: fetches by internal id and unwraps the review", async () => {
  const { ctx, calls } = mockCtx([{ body: { review: { id: 111, rating: 5 } } }]);
  const out = await getReview.execute({ id: 111 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/reviews/111");
  assertEquals(out, { review: { id: 111, rating: 5 } });
});
