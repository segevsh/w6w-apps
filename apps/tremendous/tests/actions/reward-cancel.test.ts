import { assertEquals, assertRejects } from "@std/assert";
import rewardCancel from "../../actions/reward-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("reward-cancel: posts to cancel and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await rewardCancel.execute({ id: "CED3MVGA0K9O" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/rewards/CED3MVGA0K9O/cancel");
  assertEquals(result, { ok: true });
});

Deno.test("reward-cancel: a redeemed reward's 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { errors: { message: "Reward has already been redeemed and cannot be canceled" } },
  }]);
  await assertRejects(async () => await rewardCancel.execute({ id: "CED3MVGA0K9O" }, ctx));
});
