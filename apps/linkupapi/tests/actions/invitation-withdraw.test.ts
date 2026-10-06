import { assertEquals, assertRejects } from "@std/assert";
import invitationWithdraw from "../../actions/invitation-withdraw.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("invitation-withdraw: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await invitationWithdraw.execute(
    { "accountId": "accountId-v", "invitationId": "invitationId-v" } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/network");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "withdraw",
    "params": { "invitation_id": "invitationId-v" },
  });
});

Deno.test("invitation-withdraw: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () =>
      await invitationWithdraw.execute(
        { "accountId": "accountId-v", "invitationId": "invitationId-v" } as never,
        ctx,
      ),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
