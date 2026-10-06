import { assertEquals, assertRejects } from "@std/assert";
import conversationGet from "../../actions/conversation-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("conversation-get: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await conversationGet.execute(
    {
      "accountId": "accountId-v",
      "conversationId": "conversationId-v",
      "profileUrl": "profileUrl-v",
      "phoneNumber": "phoneNumber-v",
      "count": 5,
      "cursor": "cursor-v",
      "markAsRead": true,
      "salesNav": true,
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/messages");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "get_conversation",
    "params": {
      "conversation_id": "conversationId-v",
      "profile_url": "profileUrl-v",
      "phone_number": "phoneNumber-v",
      "count": 5,
      "cursor": "cursor-v",
      "mark_as_read": true,
      "sales_nav": true,
    },
  });
});

Deno.test("conversation-get: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await conversationGet.execute({ "accountId": "accountId-v" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/messages");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "get_conversation",
    "params": {},
  });
});

Deno.test("conversation-get: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await conversationGet.execute({ "accountId": "accountId-v" } as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
