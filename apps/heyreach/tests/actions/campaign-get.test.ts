import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-get.ts";

test("campaign-get: the campaign id is a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 5, status: "IN_PROGRESS" } }]);
  const result = await action.execute!({ campaignId: 5 }, ctx);
  assertEquals(calls[0].url, "https://api.heyreach.io/api/public/campaign/GetById?campaignId=5");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: 5, status: "IN_PROGRESS" });
});
