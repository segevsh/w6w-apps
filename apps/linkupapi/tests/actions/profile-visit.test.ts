import { assertEquals, assertRejects } from "@std/assert";
import profileVisit from "../../actions/profile-visit.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("profile-visit: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await profileVisit.execute(
    {
      "accountId": "accountId-v",
      "profileUrl": "profileUrl-v",
      "identifier": "identifier-v",
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/profiles");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "visit",
    "params": { "profile_url": "profileUrl-v", "identifier": "identifier-v" },
  });
});

Deno.test("profile-visit: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await profileVisit.execute({ "accountId": "accountId-v" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/profiles");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "visit",
    "params": {},
  });
});

Deno.test("profile-visit: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await profileVisit.execute({ "accountId": "accountId-v" } as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
