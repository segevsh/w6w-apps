import { assertEquals, assertRejects } from "@std/assert";
import rewardResend from "../../actions/reward-resend.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("reward-resend: resends with no body when no correction is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await rewardResend.execute({ id: "CED3MVGA0K9O" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/rewards/CED3MVGA0K9O/resend");
  assertEquals(calls[0].body, null);
  assertEquals(result, { ok: true });
});

Deno.test("reward-resend: sends an updated email when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await rewardResend.execute({ id: "CED3MVGA0K9O", updatedEmail: "new@example.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { updated_email: "new@example.com" });
});

Deno.test("reward-resend: refuses both email and phone at once", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () =>
    await rewardResend.execute(
      { id: "CED3MVGA0K9O", updatedEmail: "a@b.com", updatedPhone: "+15551234567" },
      ctx,
    )
  );
});
