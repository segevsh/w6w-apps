import { assertEquals } from "@std/assert";
import rewardGet from "../../actions/reward-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("reward-get: fetches by id and unwraps the reward", async () => {
  const reward = { id: "CED3MVGA0K9O", order_id: "PWU1IKBP333U" };
  const { ctx, calls } = mockCtx([{ status: 200, body: { reward } }]);
  const result = await rewardGet.execute({ id: "CED3MVGA0K9O" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/rewards/CED3MVGA0K9O");
  assertEquals(result, reward);
});
