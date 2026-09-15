import { assertEquals } from "@std/assert";
import rewardList from "../../actions/reward-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("reward-list: lists rewards with offset/limit", async () => {
  const page = { rewards: [{ id: "A" }] };
  const { ctx, calls } = mockCtx([{ status: 200, body: page }]);
  const result = await rewardList.execute({ offset: 10, limit: 50 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/rewards");
  assertEquals(queryOf(calls[0].url), { offset: "10", limit: "50" });
  assertEquals(result, page);
});
