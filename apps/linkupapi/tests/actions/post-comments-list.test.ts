import { assertEquals, assertRejects } from "@std/assert";
import postCommentsList from "../../actions/post-comments-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("post-comments-list: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await postCommentsList.execute(
    { "accountId": "accountId-v", "postUrl": "postUrl-v", "count": 5, "offset": 5 } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/content");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "get_comments",
    "params": { "post_url": "postUrl-v", "count": 5, "offset": 5 },
  });
});

Deno.test("post-comments-list: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await postCommentsList.execute(
    { "accountId": "accountId-v", "postUrl": "postUrl-v" } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/content");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "get_comments",
    "params": { "post_url": "postUrl-v" },
  });
});

Deno.test("post-comments-list: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () =>
      await postCommentsList.execute(
        { "accountId": "accountId-v", "postUrl": "postUrl-v" } as never,
        ctx,
      ),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
