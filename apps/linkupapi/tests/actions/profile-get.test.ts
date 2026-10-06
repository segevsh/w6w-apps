import { assertEquals, assertRejects } from "@std/assert";
import profileGet from "../../actions/profile-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("profile-get: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await profileGet.execute(
    {
      "accountId": "accountId-v",
      "profileUrl": "profileUrl-v",
      "identifier": "identifier-v",
      "profileUrn": "profileUrn-v",
      "salesNav": true,
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/profiles");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "get",
    "params": {
      "profile_url": "profileUrl-v",
      "identifier": "identifier-v",
      "profile_urn": "profileUrn-v",
      "sales_nav": true,
    },
  });
});

Deno.test("profile-get: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await profileGet.execute({ "accountId": "accountId-v" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/profiles");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "get",
    "params": {},
  });
});

Deno.test("profile-get: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await profileGet.execute({ "accountId": "accountId-v" } as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
