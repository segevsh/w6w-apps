import { assertEquals, assertRejects } from "@std/assert";
import inboxList from "../../actions/inbox-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("inbox-list: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await inboxList.execute(
    {
      "accountId": "accountId-v",
      "count": 5,
      "category": "STARRED",
      "cursor": "cursor-v",
      "salesNav": true,
      "unreadOnly": true,
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/messages");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "list_inbox",
    "params": {
      "count": 5,
      "category": "STARRED",
      "cursor": "cursor-v",
      "sales_nav": true,
      "unread_only": true,
    },
  });
});

Deno.test("inbox-list: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await inboxList.execute({ "accountId": "accountId-v" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/messages");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "list_inbox",
    "params": {},
  });
});

Deno.test("inbox-list: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await inboxList.execute({ "accountId": "accountId-v" } as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
