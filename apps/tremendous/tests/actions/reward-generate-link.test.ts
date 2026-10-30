import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import rewardGenerateLink from "../../actions/reward-generate-link.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("reward-generate-link: posts to generate_link and returns id + link", async () => {
  const reward = {
    id: "CED3MVGA0K9O",
    link: "https://testflight.tremendous.com/rewards/payout/abc",
  };
  const { ctx, calls } = mockCtx([{ status: 200, body: { reward } }]);
  const result = await rewardGenerateLink.execute({ id: "CED3MVGA0K9O" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/rewards/CED3MVGA0K9O/generate_link");
  assertEquals(result, reward);
});
