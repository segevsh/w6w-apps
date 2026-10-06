import { assertEquals, assertRejects } from "@std/assert";
import postComment from "../../actions/post-comment.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("post-comment: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await postComment.execute(
    {
      "accountId": "accountId-v",
      "postUrl": "postUrl-v",
      "commentText": "commentText-v",
      "companyUrl": "companyUrl-v",
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/content");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "comment",
    "params": {
      "post_url": "postUrl-v",
      "comment_text": "commentText-v",
      "company_url": "companyUrl-v",
    },
  });
});

Deno.test("post-comment: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await postComment.execute(
    { "accountId": "accountId-v", "postUrl": "postUrl-v", "commentText": "commentText-v" } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/content");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "comment",
    "params": { "post_url": "postUrl-v", "comment_text": "commentText-v" },
  });
});

Deno.test("post-comment: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () =>
      await postComment.execute(
        {
          "accountId": "accountId-v",
          "postUrl": "postUrl-v",
          "commentText": "commentText-v",
        } as never,
        ctx,
      ),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
