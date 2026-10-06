import { assertEquals, assertRejects } from "@std/assert";
import commentReply from "../../actions/comment-reply.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("comment-reply: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await commentReply.execute(
    {
      "accountId": "accountId-v",
      "trackingId": "trackingId-v",
      "profileUrn": "profileUrn-v",
      "commentUrn": "commentUrn-v",
      "commentText": "commentText-v",
      "mentionUser": true,
      "commenterName": "commenterName-v",
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/content");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "answer_comment",
    "params": {
      "tracking_id": "trackingId-v",
      "profile_urn": "profileUrn-v",
      "comment_urn": "commentUrn-v",
      "comment_text": "commentText-v",
      "mention_user": true,
      "commenter_name": "commenterName-v",
    },
  });
});

Deno.test("comment-reply: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await commentReply.execute(
    {
      "accountId": "accountId-v",
      "trackingId": "trackingId-v",
      "profileUrn": "profileUrn-v",
      "commentUrn": "commentUrn-v",
      "commentText": "commentText-v",
    } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/content");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "answer_comment",
    "params": {
      "tracking_id": "trackingId-v",
      "profile_urn": "profileUrn-v",
      "comment_urn": "commentUrn-v",
      "comment_text": "commentText-v",
    },
  });
});

Deno.test("comment-reply: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () =>
      await commentReply.execute(
        {
          "accountId": "accountId-v",
          "trackingId": "trackingId-v",
          "profileUrn": "profileUrn-v",
          "commentUrn": "commentUrn-v",
          "commentText": "commentText-v",
        } as never,
        ctx,
      ),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
