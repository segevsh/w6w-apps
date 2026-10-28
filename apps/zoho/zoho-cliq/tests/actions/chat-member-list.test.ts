import { assertEquals } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/chat-member-list.ts";

Deno.test("chat-member-list: lists members", async () => {
  const { ctx, calls } = mockCliqCtx([{
    "status": 200,
    "body": { "members": [{ "user_id": "1" }] },
  }]);
  const out = await action.execute({ "chatId": "CT_1" } as never, ctx);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/chats/CT_1/members");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { "fields": "name,email_id,user_id" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), { "members": [{ "user_id": "1" }] });
});

Deno.test("chat-member-list: is a read action", () => {
  assertEquals(action.type, "read");
});
