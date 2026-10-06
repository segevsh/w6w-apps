import { assertEquals, assertRejects } from "@std/assert";
import feedGet from "../../actions/feed-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("feed-get: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await feedGet.execute(
    { "accountId": "accountId-v", "count": 5, "cursor": "cursor-v" } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/content");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "get_feed",
    "params": { "count": 5, "cursor": "cursor-v" },
  });
});

Deno.test("feed-get: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await feedGet.execute({ "accountId": "accountId-v" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/content");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "get_feed",
    "params": {},
  });
});

Deno.test("feed-get: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await feedGet.execute({ "accountId": "accountId-v" } as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
