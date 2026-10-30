import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import propertyReviewsList from "../../actions/property-reviews-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("property-reviews-list: GET .../reviews with include and paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await propertyReviewsList.execute({ uuid: "p1", include: "guest", page: 3, per_page: 10 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/properties/p1/reviews");
  assertEquals(queryOf(calls[0].url), { include: "guest", page: "3", per_page: "10" });
});
