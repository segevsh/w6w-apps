import { assertEquals, assertRejects } from "@std/assert";
import profileReactionsList from "../../actions/profile-reactions-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("profile-reactions-list: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await profileReactionsList.execute(
    {
      "accountId": "accountId-v",
      "profileUrl": "profileUrl-v",
      "count": 5,
      "cursor": "cursor-v",
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/profiles");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "get_reactions",
    "params": { "profile_url": "profileUrl-v", "count": 5, "cursor": "cursor-v" },
  });
});

Deno.test("profile-reactions-list: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await profileReactionsList.execute(
    { "accountId": "accountId-v", "profileUrl": "profileUrl-v" } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/profiles");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "get_reactions",
    "params": { "profile_url": "profileUrl-v" },
  });
});

Deno.test("profile-reactions-list: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () =>
      await profileReactionsList.execute(
        { "accountId": "accountId-v", "profileUrl": "profileUrl-v" } as never,
        ctx,
      ),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
